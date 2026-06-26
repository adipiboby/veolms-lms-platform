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

    originalKey: {
      type: String,
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
      trim: true,
    },

    region: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },

    sourceType: {
      type: String,
      enum: ["s3", "external", "youtube", "cloudfront"],
      default: "s3",
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
      index: true,
    },

    hlsStatus: {
      type: String,
      enum: ["not_started", "processing", "ready", "failed"],
      default: "not_started",
      index: true,
    },

    hlsOutputPrefix: {
      type: String,
      trim: true,
    },

    hlsManifestKey: {
      type: String,
      trim: true,
    },

    mediaConvertJobId: {
      type: String,
      trim: true,
      index: true,
    },

    mediaConvertJobStatus: {
      type: String,
      trim: true,
    },

    processingError: {
      type: String,
      trim: true,
    },

    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

videoAssetSchema.index({ adminId: 1, createdAt: -1 });
videoAssetSchema.index({ key: 1, hlsStatus: 1 });

export const VideoAsset = mongoose.model("VideoAsset", videoAssetSchema);