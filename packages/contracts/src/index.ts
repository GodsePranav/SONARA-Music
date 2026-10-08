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
