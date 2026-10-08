import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Album } from "../models/Album.js";
import { Artist } from "../models/Artist.js";
import { Playlist } from "../models/Playlist.js";
import { Track } from "../models/Track.js";
import { env } from "../config.js";

export const catalogRouter = Router();
catalogRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Catalog request limit reached.",
      },
    },
  }),
);
export const catalogQuerySchema = z.object({
  cursor: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  q: z.string().trim().max(100).optional(),
});
export const catalogIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const sign = (id: string, expires: string): string =>
  createHmac("sha256", env.STREAM_URL_SECRET)
    .update(`${id}:${expires}`)
    .digest("hex");
const validSignature = (
  id: string,
  expires: string,
  signature: string,
): boolean => {
  const expected = Buffer.from(sign(id, expires), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
const idOf = (value: { _id: unknown }): string => String(value._id);

catalogRouter.get("/tracks", async (req, res, next) => {
  try {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid catalog query.",
        },
      });
      return;
    }
    const { cursor, limit, q } = parsed.data;
    const filter = {
      ...(cursor ? { _id: { $gt: cursor } } : {}),
      ...(q ? { $text: { $search: q } } : {}),
    };
    const rows = await Track.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .select(
        "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
      )
      .lean();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const data = page.map((row) => ({
      id: idOf(row),
      title: row.title,
      artistId: String(row.artistId),
      artistName: row.artistName,
      albumId: row.albumId ? String(row.albumId) : null,
      albumName: row.albumName ?? null,
      coverUrl: row.coverUrl,
      durationSeconds: row.durationSeconds,
      licenseUrl: row.licenseUrl,
      tags: row.tags,
      explicit: row.explicit,
    }));
    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({
      data,
      page: {
        nextCursor:
          hasMore && page.length ? idOf(page[page.length - 1]!) : null,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/tracks/:id", async (req, res, next) => {
  try {
    const id = catalogIdSchema.safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid track id." },
      });
      return;
    }
    const row = await Track.findById(id.data)
      .select(
        "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
      )
      .lean();
    if (!row) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Track not found." } });
      return;
    }
    res.json({
      data: {
        id: idOf(row),
        title: row.title,
        artistId: String(row.artistId),
        artistName: row.artistName,
        albumId: row.albumId ? String(row.albumId) : null,
        albumName: row.albumName ?? null,
        coverUrl: row.coverUrl,
        durationSeconds: row.durationSeconds,
        licenseUrl: row.licenseUrl,
        tags: row.tags,
        explicit: row.explicit,
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/artists", async (req, res, next) => {
  try {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid catalog query.",
        },
      });
      return;
    }
    const { cursor, limit, q } = parsed.data;
    const rows = await Artist.find({
      ...(cursor ? { _id: { $gt: cursor } } : {}),
      ...(q
        ? {
            name: {
              $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          }
        : {}),
    })
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.json({
      data: page.map((row) => ({
        id: idOf(row),
        name: row.name,
        imageUrl: row.imageUrl,
        genres: row.genres,
      })),
      page: {
        nextCursor:
          hasMore && page.length ? idOf(page[page.length - 1]!) : null,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/artists/:id", async (req, res, next) => {
  try {
    const id = catalogIdSchema.safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid artist id." },
      });
      return;
    }
    const artist = await Artist.findById(id.data).lean();
    if (!artist) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Artist not found." } });
      return;
    }
    const [albums, tracks] = await Promise.all([
      Album.find({ artistId: artist._id })
        .sort({ releaseDate: -1, _id: 1 })
        .limit(100)
        .lean(),
      Track.find({ artistId: artist._id })
        .sort({ _id: 1 })
        .limit(10)
        .select(
          "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
        )
        .lean(),
    ]);
    res.json({
      data: {
        id: idOf(artist),
        name: artist.name,
        imageUrl: artist.imageUrl,
        genres: artist.genres,
        albums: albums.map((album) => ({
          id: idOf(album),
          name: album.name,
          artistId: String(album.artistId),
          artistName: album.artistName,
          imageUrl: album.imageUrl,
          releaseDate: album.releaseDate,
          releaseType: album.releaseType,
        })),
        popularTracks: tracks.map((track) => ({
          id: idOf(track),
          title: track.title,
          artistId: String(track.artistId),
          artistName: track.artistName,
          albumId: track.albumId ? String(track.albumId) : null,
          albumName: track.albumName ?? null,
          coverUrl: track.coverUrl,
          durationSeconds: track.durationSeconds,
          licenseUrl: track.licenseUrl,
          tags: track.tags,
          explicit: track.explicit,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/albums", async (req, res, next) => {
  try {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid catalog query.",
        },
      });
      return;
    }
    const { cursor, limit, q } = parsed.data;
    const rows = await Album.find({
      ...(cursor ? { _id: { $gt: cursor } } : {}),
      ...(q ? { $text: { $search: q } } : {}),
    })
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const data = await Promise.all(
      page.map(async (row) => ({
        id: idOf(row),
        name: row.name,
        artistId: String(row.artistId),
        artistName: row.artistName,
        imageUrl: row.imageUrl,
        releaseDate: row.releaseDate,
        releaseType: row.releaseType,
        trackCount: await Track.countDocuments({ albumId: row._id }),
      })),
    );
    res.json({
      data,
      page: {
        nextCursor:
          hasMore && page.length ? idOf(page[page.length - 1]!) : null,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/albums/:id", async (req, res, next) => {
  try {
    const id = catalogIdSchema.safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid album id." },
      });
      return;
    }
    const album = await Album.findById(id.data).lean();
    if (!album) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Album not found." } });
      return;
    }
    const tracks = await Track.find({ albumId: album._id })
      .sort({ _id: 1 })
      .select(
        "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
      )
      .lean();
    res.json({
      data: {
        id: idOf(album),
        name: album.name,
        artistId: String(album.artistId),
        artistName: album.artistName,
        imageUrl: album.imageUrl,
        releaseDate: album.releaseDate,
        releaseType: album.releaseType,
        tracks: tracks.map((track) => ({
          id: idOf(track),
          title: track.title,
          artistId: String(track.artistId),
          artistName: track.artistName,
          albumId: track.albumId ? String(track.albumId) : null,
          albumName: track.albumName ?? null,
          coverUrl: track.coverUrl,
          durationSeconds: track.durationSeconds,
          licenseUrl: track.licenseUrl,
          tags: track.tags,
          explicit: track.explicit,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/playlists", async (req, res, next) => {
  try {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid catalog query.",
        },
      });
      return;
    }
    const { cursor, limit, q } = parsed.data;
    const rows = await Playlist.find({
      visibility: "public",
      ...(cursor ? { _id: { $gt: cursor } } : {}),
      ...(q ? { $text: { $search: q } } : {}),
    })
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.json({
      data: page.map((row) => ({
        id: idOf(row),
        slug: row.slug,
        name: row.name,
        description: row.description,
        creatorName: row.creatorName,
        coverUrl: row.coverUrl,
        genres: row.genres,
        trackCount: row.trackIds.length,
      })),
      page: {
        nextCursor:
          hasMore && page.length ? idOf(page[page.length - 1]!) : null,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post(
  "/tracks/:id/stream-url",
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    try {
      const track = await Track.findById(req.params.id).select("+streamUrl");
      if (!track) {
        res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Track not found." } });
        return;
      }
      const expires = String(Math.floor(Date.now() / 1000) + 300);
      const url = `/audio/${encodeURIComponent(track.id)}?${new URLSearchParams({ expires, signature: sign(track.id, expires) })}`;
      res.json({
        data: {
          url,
          expiresAt: new Date(Number(expires) * 1000).toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

catalogRouter.get("/audio/:id", async (req, res, next) => {
  try {
    const { expires, signature } = req.query;
    if (
      typeof expires !== "string" ||
      typeof signature !== "string" ||
      !/^\d+$/.test(expires) ||
      Number(expires) < Date.now() / 1000 ||
      !validSignature(req.params.id, expires, signature)
    ) {
      res.status(403).json({
        error: {
          code: "STREAM_URL_EXPIRED",
          message: "This stream URL is invalid or expired.",
        },
      });
      return;
    }
    const track = await Track.findById(req.params.id).select("+streamUrl");
    if (!track) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Track not found." } });
      return;
    }
    const source = new URL(track.streamUrl);
    if (
      source.protocol !== "https:" ||
      !(
        source.hostname === "jamendo.com" ||
        source.hostname.endsWith(".jamendo.com")
      )
    ) {
      res.status(502).json({
        error: {
          code: "INVALID_AUDIO_SOURCE",
          message: "Audio source is unavailable.",
        },
      });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.redirect(307, source.toString());
  } catch (error) {
    next(error);
  }
});
