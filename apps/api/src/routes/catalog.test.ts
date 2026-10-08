import { describe, expect, it } from "vitest";
import { catalogIdSchema, catalogQuerySchema } from "./catalog.js";

describe("catalog request validation", () => {
  it("accepts a bounded page size and Mongo cursor", () => {
    expect(
      catalogQuerySchema.safeParse({
        limit: "40",
        cursor: "0123456789abcdef01234567",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed cursors, limits, and entity ids", () => {
    expect(
      catalogQuerySchema.safeParse({ cursor: "not-an-object-id" }).success,
    ).toBe(false);
    expect(catalogQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(catalogIdSchema.safeParse("invalid").success).toBe(false);
  });
});
