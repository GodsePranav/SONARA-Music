import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { Like } from "../models/Like.js";
import { Playlist } from "../models/Playlist.js";
import { Track } from "../models/Track.js";
import { User } from "../models/User.js";

export const libraryRouter = Router();
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
export const createPlaylistSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).default(""),
    visibility: z.enum(["public", "private"]).default("private"),
  })
  .strict();
export const updatePlaylistSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(1000).optional(),
    visibility: z.enum(["public", "private"]).optional(),
    isCollaborative: z.boolean().optional(),
    coverUrl: z.string().url().max(2048).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );
const addTrackSchema = z
  .object({ trackId: idSchema, position: z.number().int().min(0).optional() })
  .strict();
export const reorderPlaylistSchema = z
  .object({ trackIds: z.array(idSchema).max(1000) })
  .strict()
  .refine(
    ({ trackIds }) => new Set(trackIds).size === trackIds.length,
    "Track ids must be unique.",
  );
const inviteHash = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
const idOf = (value: { _id: unknown }): string => String(value._id);
const error = (
  code: string,
  message: string,
): { error: { code: string; message: string } } => ({
  error: { code, message },
});

async function editablePlaylist(id: unknown, userId: string) {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return null;
  const playlist = await Playlist.findById(parsedId.data);
  if (!playlist) return null;
  const isOwner = playlist.ownerId?.toString() === userId;
  const isCollaborator = playlist.collaboratorIds.some(
    (item) => item.toString() === userId,
  );
  return isOwner || isCollaborator ? playlist : null;
}

libraryRouter.get("/library", requireAuth, async (request, response) => {
  const userId = request.userId!;
  const [playlists, likes] = await Promise.all([
    Playlist.find({ $or: [{ ownerId: userId }, { collaboratorIds: userId }] })
      .sort({ updatedAt: -1 })
      .lean(),
    Like.countDocuments({ userId }),
  ]);
  response.json({
    data: {
      likedSongs: { trackCount: likes },
      playlists: playlists.map((playlist) => ({
        id: idOf(playlist),
        slug: playlist.slug,
        name: playlist.name,
        description: playlist.description,
        creatorName: playlist.creatorName,
        coverUrl: playlist.coverUrl,
        trackCount: playlist.trackIds.length,
        visibility: playlist.visibility,
        isCollaborative: playlist.isCollaborative,
      })),
    },
  });
});

libraryRouter.get("/me/likes", requireAuth, async (request, response) => {
  const rows = await Like.find({ userId: request.userId })
    .sort({ likedAt: -1, _id: -1 })
    .limit(500)
    .lean();
  const tracks = await Track.find({
    _id: { $in: rows.map((row) => row.trackId) },
  })
    .select(
      "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
    )
    .lean();
  const map = new Map(tracks.map((track) => [idOf(track), track]));
  const ordered = rows.flatMap((row) => {
    const track = map.get(row.trackId.toString());
    return track
      ? [
          {
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
            likedAt: row.likedAt,
          },
        ]
      : [];
  });
  response.json({ data: ordered });
});

libraryRouter.put(
  "/me/likes/:trackId",
  requireAuth,
  async (request, response) => {
    const parsed = idSchema.safeParse(request.params.trackId);
    if (!parsed.success) {
      response.status(400).json(error("VALIDATION_ERROR", "Invalid track id."));
      return;
    }
    if (!(await Track.exists({ _id: parsed.data }))) {
      response.status(404).json(error("NOT_FOUND", "Track not found."));
      return;
    }
    await Like.updateOne(
      { userId: request.userId, trackId: parsed.data },
      { $setOnInsert: { likedAt: new Date() } },
      { upsert: true },
    );
    response.status(204).end();
  },
);

libraryRouter.delete(
  "/me/likes/:trackId",
  requireAuth,
  async (request, response) => {
    const parsed = idSchema.safeParse(request.params.trackId);
    if (!parsed.success) {
      response.status(400).json(error("VALIDATION_ERROR", "Invalid track id."));
      return;
    }
    await Like.deleteOne({ userId: request.userId, trackId: parsed.data });
    response.status(204).end();
  },
);

libraryRouter.get("/playlists/mine", requireAuth, async (request, response) => {
  const rows = await Playlist.find({
    $or: [{ ownerId: request.userId }, { collaboratorIds: request.userId }],
  })
    .sort({ updatedAt: -1 })
    .lean();
  response.json({
    data: rows.map((row) => ({
      id: idOf(row),
      slug: row.slug,
      name: row.name,
      description: row.description,
      creatorName: row.creatorName,
      coverUrl: row.coverUrl,
      trackCount: row.trackIds.length,
      visibility: row.visibility,
      isCollaborative: row.isCollaborative,
    })),
  });
});

libraryRouter.post("/playlists", requireAuth, async (request, response) => {
  const parsed = createPlaylistSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json(error("VALIDATION_ERROR", "Check the playlist fields."));
    return;
  }
  const user = await User.findById(request.userId).select("displayName");
  if (!user) {
    response
      .status(401)
      .json(error("ACCOUNT_NOT_FOUND", "Sign in again to continue."));
    return;
  }
  const base =
    parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "playlist";
  const playlist = await Playlist.create({
    slug: `${base}-${randomUUID()}`,
    name: parsed.data.name,
    description: parsed.data.description,
    creatorName: user.displayName,
    ownerId: request.userId,
    visibility: parsed.data.visibility,
    source: "sonara-curated",
  });
  response.status(201).json({
    data: {
      id: idOf(playlist),
      slug: playlist.slug,
      name: playlist.name,
      description: playlist.description,
      creatorName: playlist.creatorName,
      coverUrl: playlist.coverUrl,
      trackCount: 0,
      visibility: playlist.visibility,
      isCollaborative: playlist.isCollaborative,
    },
  });
});

libraryRouter.get("/playlists/:id", requireAuth, async (request, response) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) {
    response
      .status(400)
      .json(error("VALIDATION_ERROR", "Invalid playlist id."));
    return;
  }
  const playlist = await Playlist.findById(id.data).lean();
  if (!playlist) {
    response.status(404).json(error("NOT_FOUND", "Playlist not found."));
    return;
  }
  const isMember =
    playlist.ownerId?.toString() === request.userId ||
    playlist.collaboratorIds.some((item) => item.toString() === request.userId);
  if (playlist.visibility === "private" && !isMember) {
    response.status(403).json(error("FORBIDDEN", "This playlist is private."));
    return;
  }
  const tracks = await Track.find({ _id: { $in: playlist.trackIds } })
    .select(
      "title artistId artistName albumId albumName coverUrl durationSeconds licenseUrl tags explicit",
    )
    .lean();
  const trackMap = new Map(tracks.map((track) => [idOf(track), track]));
  const ordered = playlist.trackIds.flatMap((trackId) => {
    const track = trackMap.get(trackId.toString());
    return track
      ? [
          {
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
          },
        ]
      : [];
  });
  const isOwner = playlist.ownerId?.toString() === request.userId;
  const canEdit =
    isOwner ||
    playlist.collaboratorIds.some((item) => item.toString() === request.userId);
  response.json({
    data: {
      id: idOf(playlist),
      slug: playlist.slug,
      name: playlist.name,
      description: playlist.description,
      creatorName: playlist.creatorName,
      coverUrl: playlist.coverUrl,
      trackCount: ordered.length,
      visibility: playlist.visibility,
      isCollaborative: playlist.isCollaborative,
      isOwner,
      canEdit,
      tracks: ordered,
    },
  });
});

libraryRouter.patch(
  "/playlists/:id",
  requireAuth,
  async (request, response) => {
    const parsed = updatePlaylistSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json(error("VALIDATION_ERROR", "Check the playlist fields."));
      return;
    }
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Editable playlist not found."));
      return;
    }
    if (
      parsed.data.isCollaborative !== undefined &&
      playlist.ownerId?.toString() !== request.userId
    ) {
      response
        .status(403)
        .json(
          error(
            "FORBIDDEN",
            "Only the owner can change collaboration settings.",
          ),
        );
      return;
    }
    Object.assign(playlist, parsed.data);
    await playlist.save();
    response.json({
      data: {
        id: idOf(playlist),
        name: playlist.name,
        description: playlist.description,
        visibility: playlist.visibility,
        isCollaborative: playlist.isCollaborative,
      },
    });
  },
);

libraryRouter.delete(
  "/playlists/:id",
  requireAuth,
  async (request, response) => {
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist || playlist.ownerId?.toString() !== request.userId) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Owned playlist not found."));
      return;
    }
    await playlist.deleteOne();
    response.status(204).end();
  },
);

libraryRouter.post(
  "/playlists/:id/tracks",
  requireAuth,
  async (request, response) => {
    const parsed = addTrackSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid track selection."));
      return;
    }
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Editable playlist not found."));
      return;
    }
    if (!(await Track.exists({ _id: parsed.data.trackId }))) {
      response.status(404).json(error("NOT_FOUND", "Track not found."));
      return;
    }
    const trackObjectId = new Types.ObjectId(parsed.data.trackId);
    if (
      playlist.trackIds.some(
        (trackId) => trackId.toString() === parsed.data.trackId,
      )
    ) {
      response.status(409).json({
        error: {
          code: "DUPLICATE_TRACK",
          message: "This track is already in the playlist.",
          trackId: parsed.data.trackId,
        },
      });
      return;
    }
    const position = Math.min(
      parsed.data.position ?? playlist.trackIds.length,
      playlist.trackIds.length,
    );
    playlist.trackIds.splice(position, 0, trackObjectId);
    await playlist.save();
    response
      .status(201)
      .json({ data: { trackCount: playlist.trackIds.length } });
  },
);

libraryRouter.delete(
  "/playlists/:id/tracks/:trackId",
  requireAuth,
  async (request, response) => {
    const track = idSchema.safeParse(request.params.trackId);
    if (!track.success) {
      response.status(400).json(error("VALIDATION_ERROR", "Invalid track id."));
      return;
    }
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Editable playlist not found."));
      return;
    }
    playlist.trackIds = playlist.trackIds.filter(
      (trackId) => trackId.toString() !== track.data,
    );
    await playlist.save();
    response.status(204).end();
  },
);

libraryRouter.put(
  "/playlists/:id/tracks/order",
  requireAuth,
  async (request, response) => {
    const parsed = reorderPlaylistSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid playlist order."));
      return;
    }
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Editable playlist not found."));
      return;
    }
    const existing = new Set(
      playlist.trackIds.map((trackId) => trackId.toString()),
    );
    if (
      parsed.data.trackIds.length !== existing.size ||
      parsed.data.trackIds.some((trackId) => !existing.has(trackId))
    ) {
      response
        .status(400)
        .json(
          error(
            "VALIDATION_ERROR",
            "Order must include each playlist track exactly once.",
          ),
        );
      return;
    }
    playlist.trackIds = parsed.data.trackIds.map(
      (trackId) => new Types.ObjectId(trackId),
    );
    await playlist.save();
    response.status(204).end();
  },
);

libraryRouter.post(
  "/playlists/:id/duplicate",
  requireAuth,
  async (request, response) => {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) {
      response
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid playlist id."));
      return;
    }
    const source = await Playlist.findById(id.data);
    if (
      !source ||
      (source.visibility === "private" &&
        source.ownerId?.toString() !== request.userId &&
        !source.collaboratorIds.some(
          (item) => item.toString() === request.userId,
        ))
    ) {
      response.status(404).json(error("NOT_FOUND", "Playlist not found."));
      return;
    }
    const user = await User.findById(request.userId).select("displayName");
    if (!user) {
      response
        .status(401)
        .json(error("ACCOUNT_NOT_FOUND", "Sign in again to continue."));
      return;
    }
    const copy = await Playlist.create({
      slug: `${
        source.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 60) || "playlist"
      }-${randomUUID()}`,
      name: `${source.name} (copy)`.slice(0, 160),
      description: source.description,
      creatorName: user.displayName,
      ownerId: request.userId,
      coverUrl: source.coverUrl,
      trackIds: source.trackIds,
      genres: source.genres,
      source: "sonara-curated",
      visibility: "private",
    });
    response.status(201).json({
      data: {
        id: idOf(copy),
        name: copy.name,
        trackCount: copy.trackIds.length,
      },
    });
  },
);

libraryRouter.post(
  "/playlists/:id/invite",
  requireAuth,
  async (request, response) => {
    const playlist = await editablePlaylist(request.params.id, request.userId!);
    if (!playlist || playlist.ownerId?.toString() !== request.userId) {
      response
        .status(404)
        .json(error("NOT_FOUND", "Owned playlist not found."));
      return;
    }
    if (!playlist.isCollaborative) {
      response
        .status(409)
        .json(
          error(
            "COLLABORATION_DISABLED",
            "Enable collaboration before creating an invite.",
          ),
        );
      return;
    }
    const token = randomBytes(32).toString("base64url");
    playlist.inviteCodeHash = inviteHash(token);
    await playlist.save();
    response
      .status(201)
      .json({ data: { inviteToken: token, playlistId: idOf(playlist) } });
  },
);

libraryRouter.post(
  "/playlist-invites/:token/accept",
  requireAuth,
  async (request, response) => {
    const token = z.string().min(32).max(128).safeParse(request.params.token);
    if (!token.success) {
      response
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid invite token."));
      return;
    }
    const playlist = await Playlist.findOne({
      inviteCodeHash: inviteHash(token.data),
      isCollaborative: true,
      visibility: "public",
    });
    if (!playlist) {
      response
        .status(404)
        .json(
          error(
            "INVITE_INVALID",
            "This collaboration invite is invalid or expired.",
          ),
        );
      return;
    }
    if (
      playlist.ownerId?.toString() !== request.userId &&
      !playlist.collaboratorIds.some(
        (item) => item.toString() === request.userId,
      )
    )
      playlist.collaboratorIds.push(new Types.ObjectId(request.userId!));
    await playlist.save();
    response.json({
      data: { playlistId: idOf(playlist), name: playlist.name },
    });
  },
);
