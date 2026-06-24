import mongoose from "mongoose";

const videoAssetSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    bucket: {
      type: String,
      required: true,
    },

    region: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    sizeBytes: {
      type: Number,
      required: true,
    },

    sourceType: {
      type: String,
      enum: ["s3"],
      default: "s3",
    },

    status: {
      type: String,
      enum: ["uploaded", "deleted"],
      default: "uploaded",
    },
  },
  { timestamps: true }
);

export const VideoAsset = mongoose.model("VideoAsset", videoAssetSchema);