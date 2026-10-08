import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (!token) {
    response.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
    });
    return;
  }
  try {
    request.userId = verifyAccessToken(token).sub;
    next();
  } catch {
    response.status(401).json({
      error: {
        code: "INVALID_ACCESS_TOKEN",
        message: "Your session has expired.",
      },
    });
  }
}
