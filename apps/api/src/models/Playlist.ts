import { Schema, model, type InferSchemaType } from "mongoose";

const playlistSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 1000 },
    creatorName: { type: String, required: true, maxlength: 100 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    coverUrl: { type: String, default: null },
    trackIds: { type: [Schema.Types.ObjectId], ref: "Track", default: [] },
    genres: { type: [String], default: [] },
    collaboratorIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    isCollaborative: { type: Boolean, default: false },
    inviteCodeHash: { type: String, default: null, select: false },
    source: {
      type: String,
      enum: ["sonara-curated", "jamendo"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  { timestamps: true, strict: "throw" },
);

playlistSchema.index({ visibility: 1, name: 1, _id: 1 });
playlistSchema.index({ ownerId: 1, updatedAt: -1 });
playlistSchema.index({ collaboratorIds: 1, updatedAt: -1 });
playlistSchema.index({ genres: 1, _id: 1 });
playlistSchema.index({ name: "text", description: "text", genres: "text" });

export type PlaylistDocument = InferSchemaType<typeof playlistSchema>;
export const Playlist = model("Playlist", playlistSchema);
