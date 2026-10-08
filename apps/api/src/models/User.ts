import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    avatarKey: { type: String, default: null },
    locale: { type: String, default: "en" },
    settings: {
      quality: {
        type: String,
        enum: ["low", "normal", "high"],
        default: "normal",
      },
      autoplay: { type: Boolean, default: true },
      crossfadeSeconds: { type: Number, min: 0, max: 12, default: 0 },
      normalizeVolume: { type: Boolean, default: true },
      explicitFilter: { type: Boolean, default: false },
      privateSession: { type: Boolean, default: false },
      shareListeningActivity: { type: Boolean, default: true },
    },
  },
  { timestamps: true, strict: "throw" },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
