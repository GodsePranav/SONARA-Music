import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const displayNameSchema = z.string().trim().min(2).max(40);

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema,
  })
  .strict();
export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();
export const resetPasswordSchema = z
  .object({ token: z.string().min(32).max(128), password: passwordSchema })
  .strict();
export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export const settingsSchema = z
  .object({
    quality: z.enum(["low", "normal", "high"]).optional(),
    autoplay: z.boolean().optional(),
    crossfadeSeconds: z.number().int().min(0).max(12).optional(),
    normalizeVolume: z.boolean().optional(),
    explicitFilter: z.boolean().optional(),
    privateSession: z.boolean().optional(),
    shareListeningActivity: z.boolean().optional(),
  })
  .strict();
export const updateMeSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    locale: z.string().trim().min(2).max(12).optional(),
    settings: settingsSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.locale !== undefined ||
      (value.settings !== undefined && Object.keys(value.settings).length > 0),
    "At least one profile or setting change is required.",
  );

export const sessionUserSchema = z.object({
  id: z.string(),
  email: emailSchema,
  displayName: displayNameSchema,
  avatarUrl: z.string().url().nullable(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const catalogArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().url().nullable(),
  genres: z.array(z.string()),
});
export const catalogAlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  artistId: z.string(),
  artistName: z.string(),
  imageUrl: z.string().url().nullable(),
  releaseDate: z.string().nullable(),
  releaseType: z.enum(["album", "single"]),
  trackCount: z.number().int().nonnegative().optional(),
});
export const catalogTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artistId: z.string(),
  artistName: z.string(),
  albumId: z.string().nullable(),
  albumName: z.string().nullable(),
  coverUrl: z.string().url(),
  durationSeconds: z.number().positive(),
  licenseUrl: z.string().url(),
  tags: z.array(z.string()),
  explicit: z.boolean(),
});
export const catalogPlaylistSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  creatorName: z.string(),
  coverUrl: z.string().url().nullable(),
  genres: z.array(z.string()),
  trackCount: z.number().int().nonnegative(),
});
export const catalogPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
  });
export type CatalogArtist = z.infer<typeof catalogArtistSchema>;
export type CatalogAlbum = z.infer<typeof catalogAlbumSchema>;
export type CatalogTrack = z.infer<typeof catalogTrackSchema>;
export type CatalogPlaylist = z.infer<typeof catalogPlaylistSchema>;
