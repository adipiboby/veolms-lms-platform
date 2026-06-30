import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileKey: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      enum: ["pdf", "zip", "doc", "ppt", "image", "video", "audio", "other"],
      default: "other",
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    resources: {
      type: [resourceSchema],
      default: [],
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    videoKey: {
      type: String,
      default: "",
      trim: true,
    },

    videoAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VideoAsset",
      default: null,
    },

    hlsManifestKey: {
      type: String,
      default: "",
      trim: true,
    },

    hlsOutputPrefix: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: String,
      default: "",
      trim: true,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },

    originalVideoName: {
      type: String,
      default: "",
      trim: true,
    },

    sizeBytes: {
      type: Number,
      default: 0,
    },

    mimeType: {
      type: String,
      default: "",
      trim: true,
    },

    isPreview: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
    },

    lessons: {
      type: [lessonSchema],
      default: [],
    },
  },
  { _id: true },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    shortDescription: {
      type: String,
      required: true,
    },

    thumbnail: {
      type: String,
      required: true,
    },

    instructorName: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    price: {
      type: Number,
      required: true,
      default: 499,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    trailerVideoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    sections: {
      type: [sectionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export const Course = mongoose.model("Course", courseSchema);
