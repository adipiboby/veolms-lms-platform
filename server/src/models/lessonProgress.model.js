import mongoose from "mongoose";

const lessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    lessonTitle: {
      type: String,
      required: true,
    },

    sectionTitle: {
      type: String,
      required: true,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

lessonProgressSchema.index(
  { userId: 1, courseId: 1, lessonId: 1 },
  { unique: true }
);

export const LessonProgress = mongoose.model(
  "LessonProgress",
  lessonProgressSchema
);