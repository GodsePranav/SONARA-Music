import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/sonara"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("local-development-secret-change-this-value"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM: z.string().min(3).default("SONARA <no-reply@sonara.local>"),
  JAMENDO_CLIENT_ID: z.string().default(""),
  STREAM_URL_SECRET: z
    .string()
    .min(32)
    .default("local-stream-secret-change-this-value"),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production") {
  if (
    env.JWT_ACCESS_SECRET === "local-development-secret-change-this-value" ||
    env.JWT_ACCESS_SECRET.startsWith("replace-with-")
  ) {
    throw new Error(
      "JWT_ACCESS_SECRET must be set to a unique secret in production.",
    );
  }
  if (!env.SMTP_HOST) {
    throw new Error(
      "SMTP_HOST must be configured in production for password reset delivery.",
    );
  }
  if (
    env.STREAM_URL_SECRET === "local-stream-secret-change-this-value" ||
    env.STREAM_URL_SECRET.startsWith("replace-with-")
  ) {
    throw new Error(
      "STREAM_URL_SECRET must be set to a unique secret in production.",
    );
  }
}
