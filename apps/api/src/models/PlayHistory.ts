import { Schema, model, type InferSchemaType } from "mongoose";

const playHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    positionSeconds: { type: Number, required: true, min: 0, default: 0 },
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: "throw" },
);

playHistorySchema.index({ userId: 1, trackId: 1 }, { unique: true });
playHistorySchema.index({ userId: 1, updatedAt: -1 });

export type PlayHistoryDocument = InferSchemaType<typeof playHistorySchema>;
export const PlayHistory = model("PlayHistory", playHistorySchema);
