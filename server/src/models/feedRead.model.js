import mongoose from "mongoose";

const feedReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    lastReadAt: {
      type: Date,
      default: new Date(0),
      index: true,
    },
  },
  { timestamps: true },
);

const FeedRead = mongoose.model("FeedRead", feedReadSchema);

export default FeedRead;
