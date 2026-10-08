import { Schema, model, type InferSchemaType } from "mongoose";

const artistSchema = new Schema(
  {
    source: {
      type: String,
      enum: ["jamendo"],
      required: true,
      default: "jamendo",
    },
    sourceId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    imageUrl: { type: String, default: null },
    genres: { type: [String], default: [] },
  },
  { timestamps: true, strict: "throw" },
);

artistSchema.index({ source: 1, sourceId: 1 }, { unique: true });
artistSchema.index({ name: 1, _id: 1 });
artistSchema.index({ name: "text" });

export type ArtistDocument = InferSchemaType<typeof artistSchema>;
export const Artist = model("Artist", artistSchema);
