import mongoose from "mongoose";

const lessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

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

    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    watchPositionSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastWatchedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

lessonProgressSchema.index(
  {
    userId: 1,
    courseId: 1,
    lessonId: 1,
  },
  {
    unique: true,
  },
);

export const LessonProgress =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", lessonProgressSchema);
