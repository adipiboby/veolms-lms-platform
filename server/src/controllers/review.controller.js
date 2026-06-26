import mongoose from "mongoose";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Review } from "../models/review.model.js";

const getReviewStats = async (courseId) => {
  const objectCourseId = new mongoose.Types.ObjectId(courseId);

  const stats = await Review.aggregate([
    {
      $match: {
        courseId: objectCourseId,
      },
    },
    {
      $group: {
        _id: "$courseId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const result = stats[0];

  return {
    averageRating: result ? Number(result.averageRating.toFixed(1)) : 0,
    totalReviews: result ? result.totalReviews : 0,
  };
};

export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const reviews = await Review.find({ courseId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const stats = await getReviewStats(courseId);

    return res.status(200).json({
      success: true,
      stats,
      reviews,
    });
  } catch (error) {
    console.error("GET_COURSE_REVIEWS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load reviews",
      error: error.message,
    });
  }
};

export const createOrUpdateReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }

    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "Only enrolled students can review this course",
      });
    }

    const review = await Review.findOneAndUpdate(
      {
        courseId,
        userId: req.user._id,
      },
      {
        courseId,
        userId: req.user._id,
        rating: numericRating,
        comment: String(comment).trim(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).populate("userId", "name email");

    const stats = await getReviewStats(courseId);

    return res.status(200).json({
      success: true,
      message: "Review saved successfully",
      review,
      stats,
    });
  } catch (error) {
    console.error("CREATE_OR_UPDATE_REVIEW_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save review",
      error: error.message,
    });
  }
};

export const deleteMyReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }

    const review = await Review.findOneAndDelete({
      courseId,
      userId: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const stats = await getReviewStats(courseId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      stats,
    });
  } catch (error) {
    console.error("DELETE_MY_REVIEW_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};
