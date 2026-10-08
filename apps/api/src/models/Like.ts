import { Schema, model, type InferSchemaType } from "mongoose";

const likeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    likedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: "throw" },
);

likeSchema.index({ userId: 1, trackId: 1 }, { unique: true });
likeSchema.index({ userId: 1, likedAt: -1 });

export type LikeDocument = InferSchemaType<typeof likeSchema>;
export const Like = model("Like", likeSchema);
