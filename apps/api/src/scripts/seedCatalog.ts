import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config.js";
import { Artist } from "../models/Artist.js";
import { Album } from "../models/Album.js";
import { Track } from "../models/Track.js";
import { Playlist } from "../models/Playlist.js";

const itemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  duration: z.number().positive(),
  artist_id: z.string(),
  artist_name: z.string(),
  artist_image: z.string().url().optional().default(""),
  album_id: z.string().optional().default(""),
  album_name: z.string().optional().default(""),
  album_image: z.string().url().optional().default(""),
  image: z.string().url().optional().default(""),
  audio: z.string().url(),
  license_ccurl: z.string().url(),
  releasedate: z.string().optional().default(""),
  musicinfo: z
    .object({
      tags: z
        .object({
          genres: z.array(z.string()).optional().default([]),
          instruments: z.array(z.string()).optional().default([]),
          vartags: z.array(z.string()).optional().default([]),
        })
        .optional(),
    })
    .optional(),
});
const responseSchema = z.object({
  headers: z.object({ status: z.string(), code: z.number() }),
  results: z.array(itemSchema),
});
type JamendoTrack = z.infer<typeof itemSchema>;

async function fetchPage(offset: number): Promise<JamendoTrack[]> {
  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  url.search = new URLSearchParams({
    client_id: env.JAMENDO_CLIENT_ID,
    format: "json",
    limit: "200",
    offset: String(offset),
    order: "popularity_total",
    audioformat: "mp31",
    imagesize: "500",
    include: "licenses musicinfo",
    type: "albumtrack",
    ccnc: "false",
    ccnd: "false",
    ccsa: "false",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw new Error(`Jamendo API returned HTTP ${response.status}.`);
  const data = responseSchema.parse(await response.json());
  if (data.headers.code !== 0)
    throw new Error(
      `Jamendo API error ${data.headers.code}: ${data.headers.status}`,
    );
  return data.results;
}

const clean = (value: string): string => value.trim().slice(0, 200);
const genresOf = (item: JamendoTrack): string[] =>
  [
    ...(item.musicinfo?.tags?.genres ?? []),
    ...(item.musicinfo?.tags?.instruments ?? []),
    ...(item.musicinfo?.tags?.vartags ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
const isCompatibleCcBy = (license: string): boolean =>
  /creativecommons\.org\/licenses\/by\/(?:[1-4](?:\.0)?|2\.0)/i.test(license);

async function importItem(item: JamendoTrack): Promise<void> {
  if (
    !isCompatibleCcBy(item.license_ccurl) ||
    !(item.album_image || item.image)
  )
    return;
  const artist = await Artist.findOneAndUpdate(
    { source: "jamendo", sourceId: item.artist_id },
    {
      $set: {
        name: clean(item.artist_name),
        imageUrl: item.artist_image || null,
        genres: genresOf(item),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  let albumId: mongoose.Types.ObjectId | null = null;
  if (item.album_id) {
    const album = await Album.findOneAndUpdate(
      { source: "jamendo", sourceId: item.album_id },
      {
        $set: {
          name: clean(item.album_name || "Untitled album"),
          artistId: artist._id,
          artistName: clean(item.artist_name),
          imageUrl: item.album_image || item.image || null,
          releaseDate: item.releasedate || null,
          releaseType: "album",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    albumId = album._id;
  }
  await Track.findOneAndUpdate(
    { source: "jamendo", sourceId: item.id },
    {
      $set: {
        title: clean(item.name),
        artistId: artist._id,
        artistName: clean(item.artist_name),
        albumId,
        albumName: item.album_name || null,
        coverUrl: item.album_image || item.image,
        streamUrl: item.audio,
        durationSeconds: Math.round(item.duration),
        licenseUrl: item.license_ccurl,
        tags: genresOf(item),
        explicit: false,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

async function main(): Promise<void> {
  if (!env.JAMENDO_CLIENT_ID)
    throw new Error(
      "Set JAMENDO_CLIENT_ID in .env before importing the CC-BY catalog.",
    );
  await mongoose.connect(env.MONGODB_URI);
  try {
    let offset = 0;
    while (offset < 10000) {
      const items = await fetchPage(offset);
      if (!items.length) break;
      for (const item of items) await importItem(item);
      offset += items.length;
      const [tracks, artists, albums] = await Promise.all([
        Track.countDocuments({ source: "jamendo" }),
        Artist.countDocuments({ source: "jamendo" }),
        Album.countDocuments({ source: "jamendo" }),
      ]);
      console.info(
        `Imported page ending at ${offset}; catalog has ${tracks} tracks, ${artists} artists, ${albums} albums.`,
      );
      if (tracks >= 500 && artists >= 60 && albums >= 80) break;
      if (items.length < 200) break;
    }
    const tracks = await Track.find({ source: "jamendo" })
      .select("_id coverUrl tags")
      .limit(5000)
      .lean();
    if (tracks.length < 500)
      throw new Error(
        `Only ${tracks.length} compatible CC-BY tracks found; 500 are required.`,
      );
    const [artistCount, albumCount] = await Promise.all([
      Artist.countDocuments({ source: "jamendo" }),
      Album.countDocuments({ source: "jamendo" }),
    ]);
    if (artistCount < 60 || albumCount < 80)
      throw new Error(
        `Catalog minimum not met: ${artistCount} artists and ${albumCount} albums; requires 60 and 80.`,
      );
    const groups = new Map<string, typeof tracks>();
    for (const track of tracks)
      for (const tag of track.tags.length ? track.tags : ["eclectic"])
        groups.set(tag, [...(groups.get(tag) ?? []), track]);
    const candidates = [...groups.entries()]
      .filter(([, items]) => items.length >= 10)
      .sort(([a], [b]) => a.localeCompare(b));
    for (let index = 0; index < 40; index += 1) {
      const [genre, group] = candidates[index % candidates.length] ?? [
        "eclectic",
        tracks,
      ];
      const selected = group.slice(
        (index * 13) % Math.max(1, group.length - 20),
        ((index * 13) % Math.max(1, group.length - 20)) + 30,
      );
      const ids = selected.map((track) => track._id);
      if (ids.length < 10) continue;
      await Playlist.findOneAndUpdate(
        {
          slug: `sonara-${genre
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 28)}-${String(index + 1).padStart(2, "0")}`,
        },
        {
          $set: {
            name: `${genre} discoveries ${String(index + 1).padStart(2, "0")}`,
            description: `A selection of Creative Commons BY tracks tagged ${genre}.`,
            creatorName: "SONARA",
            coverUrl:
              selected[0]?.coverUrl ??
              "https://usercontent.jamendo.com?type=album&id=0&width=500",
            trackIds: ids,
            genres: [genre],
            source: "sonara-curated",
            visibility: "public",
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
    const playlistCount = await Playlist.countDocuments({
      source: "sonara-curated",
    });
    if (playlistCount < 40)
      throw new Error(
        `Could only build ${playlistCount} playlists; 40 are required.`,
      );
    console.info(
      `Catalog ready: ${tracks.length} imported tracks; ${artistCount} artists; ${albumCount} albums; ${playlistCount} playlists.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Catalog seed failed", error);
  process.exitCode = 1;
});
