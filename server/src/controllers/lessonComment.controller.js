import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { LessonComment } from "../models/lessonComment.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findLessonInCourse = (course, lessonId) => {
  if (!course?.sections?.length) return null;

  for (const section of course.sections) {
    const lesson = section.lessons?.find((item) => {
      return item?._id?.toString() === lessonId?.toString();
    });

    if (lesson) {
      return {
        section,
        lesson,
      };
    }
  }

  return null;
};

const checkStudentEnrollment = async ({ userId, courseId }) => {
  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
  });

  return Boolean(enrollment);
};

const canAccessLessonComments = async ({ req, courseId }) => {
  if (req.user?.role === "admin") {
    return true;
  }

  if (req.user?.role === "student") {
    return await checkStudentEnrollment({
      userId: req.user._id,
      courseId,
    });
  }

  return false;
};

export const getLessonComments = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or lesson id.",
      });
    }

    const course = await Course.findById(courseId).select("sections title slug");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lessonData = findLessonInCourse(course, lessonId);

    if (!lessonData) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course.",
      });
    }

    const hasAccess = await canAccessLessonComments({
      req,
      courseId,
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view comments for this lesson.",
      });
    }

    const comments = await LessonComment.find({
      courseId,
      lessonId,
    })
      .populate({
        path: "userId",
        select: "name email role",
      })
      .sort({
        isPinned: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("GET_LESSON_COMMENTS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load lesson comments.",
    });
  }
};

export const createLessonComment = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { message } = req.body;

    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or lesson id.",
      });
    }

    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required.",
      });
    }

    if (cleanMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment should be less than 1000 characters.",
      });
    }

    const course = await Course.findById(courseId).select("sections title slug");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lessonData = findLessonInCourse(course, lessonId);

    if (!lessonData) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course.",
      });
    }

    const hasAccess = await canAccessLessonComments({
      req,
      courseId,
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to comment on this lesson.",
      });
    }

    const comment = await LessonComment.create({
      courseId,
      lessonId,
      userId: req.user._id,
      role: req.user.role,
      message: cleanMessage,
    });

    const populatedComment = await LessonComment.findById(comment._id).populate({
      path: "userId",
      select: "name email role",
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("CREATE_LESSON_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment.",
    });
  }
};

export const updateLessonComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { message } = req.body;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id.",
      });
    }

    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required.",
      });
    }

    if (cleanMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment should be less than 1000 characters.",
      });
    }

    const comment = await LessonComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const isOwner = comment.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this comment.",
      });
    }

    comment.message = cleanMessage;
    comment.isEdited = true;

    await comment.save();

    const updatedComment = await LessonComment.findById(comment._id).populate({
      path: "userId",
      select: "name email role",
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("UPDATE_LESSON_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment.",
    });
  }
};

export const deleteLessonComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id.",
      });
    }

    const comment = await LessonComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const isOwner = comment.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this comment.",
      });
    }

    await comment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_LESSON_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
    });
  }
};

export const togglePinLessonComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id.",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can pin comments.",
      });
    }

    const comment = await LessonComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    comment.isPinned = !comment.isPinned;

    await comment.save();

    const updatedComment = await LessonComment.findById(comment._id).populate({
      path: "userId",
      select: "name email role",
    });

    return res.status(200).json({
      success: true,
      message: comment.isPinned
        ? "Comment pinned successfully."
        : "Comment unpinned successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("PIN_LESSON_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update pinned comment.",
    });
  }
};