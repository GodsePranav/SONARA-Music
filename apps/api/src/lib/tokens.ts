import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";
import { env } from "../config.js";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function newFamilyId(): string {
  return randomUUID();
}

export function createAccessToken(userId: Types.ObjectId): string {
  return jwt.sign(
    { sub: userId.toString(), typ: "access" },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_TTL as NonNullable<
        jwt.SignOptions["expiresIn"]
      >,
      issuer: "sonara-api",
      audience: "sonara-web",
    },
  );
}

export function verifyAccessToken(token: string): {
  sub: string;
  typ: "access";
} {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "sonara-api",
    audience: "sonara-web",
  });
  if (
    typeof payload === "string" ||
    payload.typ !== "access" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid access token");
  }
  return { sub: payload.sub, typ: "access" };
}
