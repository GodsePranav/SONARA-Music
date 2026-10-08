import { describe, expect, it } from "vitest";
import { updateMeSchema } from "@sonara/contracts";

describe("profile update contract", () => {
  it("accepts supported audio and privacy settings", () => {
    expect(
      updateMeSchema.safeParse({
        settings: {
          crossfadeSeconds: 12,
          quality: "high",
          privateSession: true,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects out-of-range crossfade and unknown fields", () => {
    expect(
      updateMeSchema.safeParse({ settings: { crossfadeSeconds: 13 } }).success,
    ).toBe(false);
    expect(updateMeSchema.safeParse({ role: "admin" }).success).toBe(false);
  });
});
