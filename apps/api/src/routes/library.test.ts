import { describe, expect, it } from "vitest";
import {
  createPlaylistSchema,
  reorderPlaylistSchema,
  updatePlaylistSchema,
} from "./library.js";

describe("playlist request validation", () => {
  it("accepts normalized playlist details and cover removal", () => {
    expect(
      createPlaylistSchema.safeParse({ name: "  Night drive  " }).success,
    ).toBe(true);
    expect(updatePlaylistSchema.safeParse({ coverUrl: null }).success).toBe(
      true,
    );
  });

  it("rejects empty updates and reorder lists containing duplicate ids", () => {
    expect(updatePlaylistSchema.safeParse({}).success).toBe(false);
    expect(
      reorderPlaylistSchema.safeParse({
        trackIds: ["0123456789abcdef01234567", "0123456789abcdef01234567"],
      }).success,
    ).toBe(false);
  });
});
