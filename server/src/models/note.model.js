import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
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

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index(
  {
    userId: 1,
    courseId: 1,
    lessonId: 1,
  },
  {
    unique: true,
  },
);

export const Note = mongoose.model("Note", noteSchema);
