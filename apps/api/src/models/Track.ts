import { Schema, model, type InferSchemaType } from "mongoose";

const trackSchema = new Schema(
  {
    source: {
      type: String,
      enum: ["jamendo", "fma", "upload"],
      required: true,
    },
    sourceId: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
    artistName: { type: String, required: true, trim: true, maxlength: 160 },
    albumId: { type: Schema.Types.ObjectId, ref: "Album", default: null },
    albumName: { type: String, default: null, maxlength: 200 },
    coverUrl: { type: String, required: true },
    streamUrl: { type: String, required: true, select: false },
    durationSeconds: { type: Number, required: true, min: 1, max: 3600 },
    licenseUrl: { type: String, required: true },
    tags: { type: [String], default: [] },
    explicit: { type: Boolean, default: false },
  },
  { timestamps: true, strict: "throw" },
);

trackSchema.index({ source: 1, sourceId: 1 }, { unique: true });
trackSchema.index({ artistId: 1, title: 1, _id: 1 });
trackSchema.index({ albumId: 1, _id: 1 });
trackSchema.index({ title: 1, _id: 1 });
trackSchema.index({
  title: "text",
  artistName: "text",
  albumName: "text",
  tags: "text",
});

export type TrackDocument = InferSchemaType<typeof trackSchema>;
export const Track = model("Track", trackSchema);
