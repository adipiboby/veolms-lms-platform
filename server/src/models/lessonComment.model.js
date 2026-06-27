import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    replyToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    replyToReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    replyToName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

const lessonCommentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    replies: {
      type: [replySchema],
      default: [],
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

lessonCommentSchema.index({
  courseId: 1,
  lessonId: 1,
  isPinned: -1,
  createdAt: -1,
});

export const LessonComment = mongoose.model(
  "LessonComment",
  lessonCommentSchema,
);
