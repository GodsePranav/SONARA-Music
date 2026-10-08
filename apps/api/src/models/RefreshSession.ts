import { Schema, model, type InferSchemaType } from "mongoose";

const refreshSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    deviceLabel: { type: String, maxlength: 120, default: "Web browser" },
  },
  { timestamps: true, strict: "throw" },
);

export type RefreshSessionDocument = InferSchemaType<
  typeof refreshSessionSchema
>;
export const RefreshSession = model("RefreshSession", refreshSessionSchema);
