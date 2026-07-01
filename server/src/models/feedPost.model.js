import mongoose from "mongoose";

const feedAttachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video", "file", "link"],
      default: "image",
    },
    title: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    key: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: true },
);

const feedReplySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const feedCommentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    replies: { type: [feedReplySchema], default: [] },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const feedPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    category: {
      type: String,
      enum: ["general", "announcement", "achievement", "update"],
      default: "general",
      index: true,
    },

    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["public", "students", "course"],
      default: "public",
      index: true,
    },

    attachments: {
      type: [feedAttachmentSchema],
      default: [],
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    comments: {
      type: [feedCommentSchema],
      default: [],
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ isPinned: -1, createdAt: -1 });
feedPostSchema.index({ priority: 1, createdAt: -1 });
feedPostSchema.index({ courseId: 1, createdAt: -1 });
feedPostSchema.index({ authorId: 1, createdAt: -1 });
feedPostSchema.index({ category: 1, createdAt: -1 });

const FeedPost = mongoose.model("FeedPost", feedPostSchema);

export default FeedPost;
