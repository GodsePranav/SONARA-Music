import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { env } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { User } from "./models/User.js";
import { updateMeSchema } from "@sonara/contracts";

export const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use((request, response, next) => {
  const requestId =
    request.header("x-request-id")?.slice(0, 100) ?? randomUUID();
  response.setHeader("X-Request-Id", requestId);
  next();
});

app.get("/health", (_request, response) =>
  response.json({ data: { status: "ok" } }),
);
app.get("/ready", (_request, response) =>
  response.json({ data: { status: "ready" } }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "development" ? 100 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts. Try again shortly.",
    },
  },
});
app.use("/api/v1/auth", authLimiter, authRouter);
app.get("/api/v1/me", requireAuth, async (request, response) => {
  const user = await User.findById(request.userId).select(
    "email displayName avatarKey locale settings",
  );
  if (!user) {
    response.status(404).json({
      error: {
        code: "USER_NOT_FOUND",
        message: "Account could not be found.",
      },
    });
    return;
  }
  response.json({
    data: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: null,
      locale: user.locale,
      settings: user.settings,
    },
  });
});
app.patch("/api/v1/me", requireAuth, async (request, response) => {
  const parsed = updateMeSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        fields: parsed.error.issues.map((issue) => ({
          field: issue.path.map(String).join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }
  const updates: Record<string, string | boolean | number> = {};
  if (parsed.data.displayName !== undefined) {
    updates.displayName = parsed.data.displayName;
  }
  if (parsed.data.locale !== undefined) updates.locale = parsed.data.locale;
  if (parsed.data.settings) {
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      if (value !== undefined) updates[`settings.${key}`] = value;
    }
  }
  const user = await User.findByIdAndUpdate(
    request.userId,
    { $set: updates },
    { new: true, runValidators: true },
  ).select("email displayName avatarKey locale settings");
  if (!user) {
    response.status(404).json({
      error: { code: "USER_NOT_FOUND", message: "Account could not be found." },
    });
    return;
  }
  response.json({
    data: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: null,
      locale: user.locale,
      settings: user.settings,
    },
  });
});

app.use((_request, response) =>
  response
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found." } }),
);

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  void next;
  const message = error instanceof Error ? error.message : "Unknown error";
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production" ? "Something went wrong." : message,
    },
  });
};
app.use(errorHandler);
