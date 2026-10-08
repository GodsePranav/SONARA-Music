import { describe, expect, it } from "vitest";
import {
  createAccessToken,
  hashToken,
  newRefreshToken,
  verifyAccessToken,
} from "./tokens.js";
import { Types } from "mongoose";

describe("session token helpers", () => {
  it("hashes a token deterministically without returning the source token", () => {
    const token = "refresh-secret-value";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it("creates opaque refresh tokens with sufficient entropy", () => {
    const first = newRefreshToken();
    const second = newRefreshToken();
    expect(first).toHaveLength(64);
    expect(second).not.toBe(first);
  });

  it("signs and verifies an access token for its intended audience", () => {
    const userId = new Types.ObjectId();
    const verified = verifyAccessToken(createAccessToken(userId));
    expect(verified).toEqual({ sub: userId.toString(), typ: "access" });
  });
});
