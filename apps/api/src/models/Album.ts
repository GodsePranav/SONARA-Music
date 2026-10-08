import { Schema, model, type InferSchemaType } from "mongoose";

const albumSchema = new Schema(
  {
    source: {
      type: String,
      enum: ["jamendo"],
      required: true,
      default: "jamendo",
    },
    sourceId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
    artistName: { type: String, required: true, trim: true, maxlength: 160 },
    imageUrl: { type: String, default: null },
    releaseDate: { type: String, default: null },
    releaseType: { type: String, enum: ["album", "single"], default: "album" },
  },
  { timestamps: true, strict: "throw" },
);

albumSchema.index({ source: 1, sourceId: 1 }, { unique: true });
albumSchema.index({ artistId: 1, releaseDate: -1, _id: 1 });
albumSchema.index({ name: 1, _id: 1 });
albumSchema.index({ name: "text", artistName: "text" });

export type AlbumDocument = InferSchemaType<typeof albumSchema>;
export const Album = model("Album", albumSchema);
