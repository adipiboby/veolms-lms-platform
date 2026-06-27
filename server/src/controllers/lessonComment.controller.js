import mongoose from "mongoose";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { LessonComment } from "../models/lessonComment.model.js";

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const populateComment = async (comment) => {
  await comment.populate([
    {
      path: "userId",
      select: "name email role avatar photo profilePhoto profileImage picture",
    },
    {
      path: "replies.userId",
      select: "name email role avatar photo profilePhoto profileImage picture",
    },
    {
      path: "replies.replyToUserId",
      select: "name email role avatar photo profilePhoto profileImage picture",
    },
  ]);

  return comment;
};

const findLessonById = (course, lessonId) => {
  for (const section of course.sections || []) {
    const lesson = section.lessons?.id?.(lessonId);

    if (lesson) {
      return lesson;
    }
  }

  return null;
};

const canAccessLessonComments = async ({ req, courseId, lessonId }) => {
  const course = await Course.findById(courseId);

  if (!course) {
    return {
      allowed: false,
      statusCode: 404,
      message: "Course not found",
      course: null,
      isAdminOwner: false,
    };
  }

  const lesson = findLessonById(course, lessonId);

  if (!lesson) {
    return {
      allowed: false,
      statusCode: 404,
      message: "Lesson not found",
      course,
      isAdminOwner: false,
    };
  }

  if (req.user.role === "admin") {
    if (!course.createdBy) {
      course.createdBy = req.user._id;
      await course.save();
    }

    const isOwner = course.createdBy.toString() === req.user._id.toString();

    if (!isOwner) {
      return {
        allowed: false,
        statusCode: 403,
        message: "You can access only comments from courses created by you",
        course,
        isAdminOwner: false,
      };
    }

    return {
      allowed: true,
      course,
      isAdminOwner: true,
    };
  }

  if (req.user.role === "student") {
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (!enrollment) {
      return {
        allowed: false,
        statusCode: 403,
        message: "You are not enrolled in this course",
        course,
        isAdminOwner: false,
      };
    }

    return {
      allowed: true,
      course,
      isAdminOwner: false,
    };
  }

  return {
    allowed: false,
    statusCode: 403,
    message: "Access denied",
    course,
    isAdminOwner: false,
  };
};

export const getLessonComments = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const access = await canAccessLessonComments({
      req,
      courseId,
      lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    const comments = await LessonComment.find({
      courseId,
      lessonId,
    })
      .populate(
        "userId",
        "name email role avatar photo profilePhoto profileImage picture",
      )
      .populate(
        "replies.userId",
        "name email role avatar photo profilePhoto profileImage picture",
      )
      .populate(
        "replies.replyToUserId",
        "name email role avatar photo profilePhoto profileImage picture",
      )
      .sort({ isPinned: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("GET_LESSON_COMMENTS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

export const createLessonComment = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required",
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment should be less than 1000 characters",
      });
    }

    const access = await canAccessLessonComments({
      req,
      courseId,
      lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    let comment = await LessonComment.create({
      courseId,
      lessonId,
      userId: req.user._id,
      message: message.trim(),
      replies: [],
    });

    comment = await populateComment(comment);

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("CREATE_LESSON_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

export const replyToLessonComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { message, replyToUserId, replyToReplyId, replyToName } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Reply should be less than 1000 characters",
      });
    }

    let comment = await LessonComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const access = await canAccessLessonComments({
      req,
      courseId: comment.courseId,
      lessonId: comment.lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    let finalReplyToUserId = null;
    let finalReplyToReplyId = null;
    let finalReplyToName = "";

    if (replyToReplyId) {
      if (!isValidObjectId(replyToReplyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reply target",
        });
      }

      const targetReply = comment.replies.id(replyToReplyId);

      if (!targetReply) {
        return res.status(404).json({
          success: false,
          message: "Reply target not found",
        });
      }

      finalReplyToReplyId = targetReply._id;
      finalReplyToUserId = targetReply.userId;
      finalReplyToName = String(replyToName || "")
        .trim()
        .slice(0, 80);
    } else if (replyToUserId) {
      if (!isValidObjectId(replyToUserId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reply user target",
        });
      }

      finalReplyToUserId = replyToUserId;
      finalReplyToName = String(replyToName || "")
        .trim()
        .slice(0, 80);
    }

    comment.replies.push({
      userId: req.user._id,
      replyToUserId: finalReplyToUserId,
      replyToReplyId: finalReplyToReplyId,
      replyToName: finalReplyToName,
      message: message.trim(),
    });

    await comment.save();

    comment = await populateComment(comment);

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      comment,
    });
  } catch (error) {
    console.error("REPLY_TO_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add reply",
      error: error.message,
    });
  }
};

export const deleteLessonComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await LessonComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const access = await canAccessLessonComments({
      req,
      courseId: comment.courseId,
      lessonId: comment.lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    const isCommentOwner =
      comment.userId.toString() === req.user._id.toString();

    if (!isCommentOwner && !access.isAdminOwner) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own comment",
      });
    }

    await comment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      commentId: id,
    });
  } catch (error) {
    console.error("DELETE_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};

export const deleteLessonCommentReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;

    let comment = await LessonComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const access = await canAccessLessonComments({
      req,
      courseId: comment.courseId,
      lessonId: comment.lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    const reply = comment.replies.id(replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    const isReplyOwner = reply.userId.toString() === req.user._id.toString();

    if (!isReplyOwner && !access.isAdminOwner) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own reply",
      });
    }

    comment.replies.pull(replyId);

    await comment.save();

    comment = await populateComment(comment);

    return res.status(200).json({
      success: true,
      message: "Reply deleted successfully",
      comment,
    });
  } catch (error) {
    console.error("DELETE_COMMENT_REPLY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete reply",
      error: error.message,
    });
  }
};

export const togglePinLessonComment = async (req, res) => {
  try {
    const { id } = req.params;

    let comment = await LessonComment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const access = await canAccessLessonComments({
      req,
      courseId: comment.courseId,
      lessonId: comment.lessonId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message,
      });
    }

    if (!access.isAdminOwner) {
      return res.status(403).json({
        success: false,
        message: "Only course admin can pin comments",
      });
    }

    comment.isPinned = !comment.isPinned;

    await comment.save();

    comment = await populateComment(comment);

    return res.status(200).json({
      success: true,
      message: comment.isPinned ? "Comment pinned" : "Comment unpinned",
      comment,
    });
  } catch (error) {
    console.error("PIN_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment",
      error: error.message,
    });
  }
};
