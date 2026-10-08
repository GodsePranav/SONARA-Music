import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import argon2 from "argon2";
import nodemailer from "nodemailer";
import type { Types } from "mongoose";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@sonara/contracts";
import { User } from "../models/User.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { PasswordReset } from "../models/PasswordReset.js";
import {
  createAccessToken,
  hashToken,
  newFamilyId,
  newRefreshToken,
} from "../lib/tokens.js";
import { env } from "../config.js";

export const authRouter = Router();
const cookieName = "sonara_refresh";
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE === "true" || env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(response: Response, token: string): void {
  response.cookie(cookieName, token, refreshCookieOptions);
}

function clearRefreshCookie(response: Response): void {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: refreshCookieOptions.secure,
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

async function issueSession(
  user: {
    _id: Types.ObjectId;
    email: string;
    displayName: string;
    avatarKey: string | null;
  },
  response: Response,
  familyId = newFamilyId(),
): Promise<void> {
  const refreshToken = newRefreshToken();
  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  setRefreshCookie(response, refreshToken);
  response.json({
    data: {
      accessToken: createAccessToken(user._id),
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
      },
    },
  });
}

function invalidBody(
  response: Response,
  issues: Array<{ path: PropertyKey[]; message: string }>,
): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      fields: issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    },
  });
}

authRouter.post("/signup", async (request: Request, response: Response) => {
  const parsed = signUpSchema.safeParse(request.body);
  if (!parsed.success) {
    invalidBody(response, parsed.error.issues);
    return;
  }
  const { email, password, displayName } = parsed.data;
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await User.create({ email, passwordHash, displayName });
    await issueSession(
      {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarKey: user.avatarKey ?? null,
      },
      response,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      response.status(409).json({
        error: {
          code: "EMAIL_TAKEN",
          message: "An account already uses this email.",
        },
      });
      return;
    }
    throw error;
  }
});

authRouter.post("/login", async (request: Request, response: Response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    invalidBody(response, parsed.error.issues);
    return;
  }
  const user = await User.findOne({ email: parsed.data.email }).select(
    "+passwordHash",
  );
  if (
    !user ||
    !(await argon2.verify(user.passwordHash, parsed.data.password))
  ) {
    response.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
    return;
  }
  await issueSession(
    {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      avatarKey: user.avatarKey ?? null,
    },
    response,
  );
});

authRouter.post("/refresh", async (request: Request, response: Response) => {
  const rawToken = request.cookies[cookieName] as string | undefined;
  if (!rawToken) {
    response.status(401).json({
      error: {
        code: "REFRESH_REQUIRED",
        message: "Sign in again to continue.",
      },
    });
    return;
  }
  const tokenHash = hashToken(rawToken);
  const session = await RefreshSession.findOne({ tokenHash }).select(
    "+tokenHash",
  );
  if (!session) {
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: "INVALID_REFRESH",
        message: "Sign in again to continue.",
      },
    });
    return;
  }
  if (session.revokedAt || session.expiresAt <= new Date()) {
    await RefreshSession.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: "REFRESH_REUSE_DETECTED",
        message: "Your session was revoked. Sign in again.",
      },
    });
    return;
  }
  const nextToken = newRefreshToken();
  const nextHash = hashToken(nextToken);
  const claimed = await RefreshSession.findOneAndUpdate(
    { _id: session._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date(), replacedBy: nextHash } },
    { new: true },
  );
  if (!claimed) {
    await RefreshSession.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: "REFRESH_REUSE_DETECTED",
        message: "Your session was revoked. Sign in again.",
      },
    });
    return;
  }
  const user = await User.findById(session.userId);
  if (!user) {
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: "ACCOUNT_NOT_FOUND",
        message: "Sign in again to continue.",
      },
    });
    return;
  }
  await RefreshSession.create({
    userId: user._id,
    tokenHash: nextHash,
    familyId: session.familyId,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  setRefreshCookie(response, nextToken);
  response.json({
    data: {
      accessToken: createAccessToken(user._id),
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
      },
    },
  });
});

authRouter.post("/logout", async (request: Request, response: Response) => {
  const rawToken = request.cookies[cookieName] as string | undefined;
  if (rawToken) {
    const session = await RefreshSession.findOne({
      tokenHash: hashToken(rawToken),
    });
    if (session)
      await RefreshSession.updateMany(
        { familyId: session.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
  }
  clearRefreshCookie(response);
  response.status(204).end();
});

authRouter.post(
  "/password/forgot",
  async (request: Request, response: Response) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      invalidBody(response, parsed.error.issues);
      return;
    }
    const user = await User.findOne({ email: parsed.data.email });
    if (user) {
      if (env.NODE_ENV === "production" && !env.SMTP_HOST) {
        response.status(503).json({
          error: {
            code: "RESET_DELIVERY_UNAVAILABLE",
            message: "Password reset is temporarily unavailable.",
          },
        });
        return;
      }
      const token = randomBytes(32).toString("base64url");
      await PasswordReset.create({
        userId: user._id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
      if (env.SMTP_HOST) {
        const transport = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          ...(env.SMTP_USER
            ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
            : {}),
        });
        const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
        try {
          await transport.sendMail({
            from: env.MAIL_FROM,
            to: user.email,
            subject: "Reset your SONARA password",
            text: `Use this one-time link to reset your password. It expires in 30 minutes: ${resetUrl}`,
          });
        } catch (error) {
          console.error(
            "Password reset email delivery failed",
            error instanceof Error ? error.message : "Unknown delivery error",
          );
        }
      } else if (env.NODE_ENV !== "production") {
        console.info(
          `Development password reset URL for ${user.email}: http://localhost:5173/reset-password?token=${token}`,
        );
      }
    }
    response.status(202).json({
      data: {
        message: "If an account matches, reset instructions will be sent.",
      },
    });
  },
);

authRouter.post(
  "/password/reset",
  async (request: Request, response: Response) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      invalidBody(response, parsed.error.issues);
      return;
    }
    const tokenHash = hashToken(parsed.data.token);
    const reset = await PasswordReset.findOneAndUpdate(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!reset) {
      response.status(400).json({
        error: {
          code: "RESET_INVALID",
          message: "This reset link is invalid or expired.",
        },
      });
      return;
    }
    const passwordHash = await argon2.hash(parsed.data.password, {
      type: argon2.argon2id,
    });
    await User.updateOne({ _id: reset.userId }, { $set: { passwordHash } });
    await RefreshSession.updateMany(
      { userId: reset.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await PasswordReset.deleteMany({ userId: reset.userId });
    response.status(204).end();
  },
);
