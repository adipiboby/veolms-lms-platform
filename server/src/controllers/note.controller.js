import mongoose from "mongoose";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Note } from "../models/note.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findLessonInCourse = (course, lessonId) => {
  if (!course?.sections?.length) return null;

  for (const section of course.sections) {
    const lesson = section.lessons?.find(
      (item) => String(item._id) === String(lessonId)
    );

    if (lesson) {
      return lesson;
    }
  }

  return null;
};

const checkStudentCourseAccess = async ({ userId, courseId, lessonId }) => {
  if (!isValidObjectId(courseId)) {
    return {
      allowed: false,
      status: 400,
      message: "Invalid course id",
    };
  }

  if (!isValidObjectId(lessonId)) {
    return {
      allowed: false,
      status: 400,
      message: "Invalid lesson id",
    };
  }

  const course = await Course.findById(courseId);

  if (!course) {
    return {
      allowed: false,
      status: 404,
      message: "Course not found",
    };
  }

  const lesson = findLessonInCourse(course, lessonId);

  if (!lesson) {
    return {
      allowed: false,
      status: 404,
      message: "Lesson not found in this course",
    };
  }

  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
  });

  if (!enrollment) {
    return {
      allowed: false,
      status: 403,
      message: "Only enrolled students can access lesson notes",
    };
  }

  return {
    allowed: true,
    course,
    lesson,
    enrollment,
  };
};

export const getMyCourseNotes = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "Only enrolled students can view notes for this course",
      });
    }

    const notes = await Note.find({
      userId: req.user._id,
      courseId,
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error("GET_MY_COURSE_NOTES_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load notes",
      error: error.message,
    });
  }
};

export const getMyLessonNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const access = await checkStudentCourseAccess({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const note = await Note.findOne({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("GET_MY_LESSON_NOTE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load lesson note",
      error: error.message,
    });
  }
};

export const saveMyLessonNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { content = "" } = req.body;

    const access = await checkStudentCourseAccess({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    const cleanContent = String(content).trim();

    const note = await Note.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId,
        lessonId,
      },
      {
        userId: req.user._id,
        courseId,
        lessonId,
        content: cleanContent,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Note saved successfully",
      note,
    });
  } catch (error) {
    console.error("SAVE_MY_LESSON_NOTE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save note",
      error: error.message,
    });
  }
};

export const deleteMyLessonNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const access = await checkStudentCourseAccess({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    await Note.findOneAndDelete({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("DELETE_MY_LESSON_NOTE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
      error: error.message,
    });
  }
};