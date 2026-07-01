import mongoose from "mongoose";

import { Course } from "../models/course.model.js";
import { LessonProgress } from "../models/lessonProgress.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeWatchSeconds = (value) => {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
};

const findLessonInCourse = (course, lessonId) => {
  if (!course?.sections?.length) return null;

  for (const section of course.sections) {
    const lessons = Array.isArray(section.lessons) ? section.lessons : [];

    const lesson = lessons.find((item) => {
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

const getTotalLessons = (course) => {
  if (!course?.sections?.length) return 0;

  return course.sections.reduce((courseTotal, section) => {
    const lessons = Array.isArray(section.lessons) ? section.lessons : [];
    return courseTotal + lessons.length;
  }, 0);
};

const buildCourseProgress = async ({ userId, courseId }) => {
  const course = await Course.findById(courseId).select("sections title slug");

  if (!course) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  const totalLessons = getTotalLessons(course);

  const lessonProgress = await LessonProgress.find({
    userId,
    courseId,
  }).sort({ updatedAt: -1 });

  const completedLessons = lessonProgress.filter((item) => {
    return item.isCompleted === true;
  }).length;

  const progressPercentage =
    totalLessons === 0
      ? 0
      : Math.min(100, Math.round((completedLessons / totalLessons) * 100));

  const latestProgress = lessonProgress[0];

  return {
    totalLessons,
    completedLessons,
    progressPercentage,
    lessonProgress,
    currentLessonId: latestProgress?.lessonId || null,
  };
};

const validateCourseAndLesson = async ({ courseId, lessonId }) => {
  if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
    const error = new Error("Invalid course or lesson id.");
    error.statusCode = 400;
    throw error;
  }

  const course = await Course.findById(courseId).select("sections title slug");

  if (!course) {
    const error = new Error("Course not found.");
    error.statusCode = 404;
    throw error;
  }

  const lessonData = findLessonInCourse(course, lessonId);

  if (!lessonData) {
    const error = new Error("Lesson not found in this course.");
    error.statusCode = 404;
    throw error;
  }

  return {
    course,
    lessonData,
  };
};

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id.",
      });
    }

    const progress = await buildCourseProgress({
      userId: req.user._id,
      courseId,
    });

    return res.status(200).json({
      success: true,
      ...progress,
      progress,
    });
  } catch (error) {
    console.error("GET_COURSE_PROGRESS_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch course progress.",
    });
  }
};

export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    /*
      IMPORTANT:
      isCompleted can be true or false.
      Do not use: const isCompleted = req.body.isCompleted || true
      because false will become true.
    */
    const isCompleted =
      typeof req.body.isCompleted === "boolean" ? req.body.isCompleted : true;

    await validateCourseAndLesson({
      courseId,
      lessonId,
    });

    const updateData = {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    };

    /*
      When lesson is completed, reset resume position to 0.
      So if student opens completed lesson again, it starts from beginning.
    */
    if (isCompleted) {
      updateData.watchPositionSeconds = 0;
      updateData.lastWatchedAt = new Date();
    }

    const progressItem = await LessonProgress.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId,
        lessonId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    const progress = await buildCourseProgress({
      userId: req.user._id,
      courseId,
    });

    return res.status(200).json({
      success: true,
      message: isCompleted
        ? "Lesson marked as completed."
        : "Lesson unmarked successfully.",
      lessonProgressItem: progressItem,
      ...progress,
      progress,
    });
  } catch (error) {
    console.error("UPDATE_LESSON_PROGRESS_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update lesson progress.",
    });
  }
};

export const getLessonWatchPosition = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    await validateCourseAndLesson({
      courseId,
      lessonId,
    });

    const progressItem = await LessonProgress.findOne({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    return res.status(200).json({
      success: true,
      watchPositionSeconds: progressItem?.watchPositionSeconds || 0,
      durationSeconds: progressItem?.durationSeconds || 0,
      isCompleted: progressItem?.isCompleted || false,
      lastWatchedAt: progressItem?.lastWatchedAt || null,
    });
  } catch (error) {
    console.error("GET_LESSON_WATCH_POSITION_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch lesson watch position.",
    });
  }
};

export const saveLessonWatchPosition = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const watchPositionSeconds = normalizeWatchSeconds(
      req.body.watchPositionSeconds ?? req.body.currentTime,
    );

    const durationSeconds = normalizeWatchSeconds(
      req.body.durationSeconds ?? req.body.duration,
    );

    await validateCourseAndLesson({
      courseId,
      lessonId,
    });

    const existingProgress = await LessonProgress.findOne({
      userId: req.user._id,
      courseId,
      lessonId,
    });

    /*
      If lesson is already completed, do not store resume time.
      Completed lesson should open from beginning.
    */
    if (existingProgress?.isCompleted) {
      return res.status(200).json({
        success: true,
        message: "Lesson already completed. Watch position not updated.",
        watchPositionSeconds: 0,
        durationSeconds: existingProgress.durationSeconds || durationSeconds,
        isCompleted: true,
      });
    }

    const safeDurationSeconds =
      durationSeconds > 0
        ? durationSeconds
        : existingProgress?.durationSeconds || 0;

    let safeWatchPositionSeconds = watchPositionSeconds;

    if (safeDurationSeconds > 0) {
      /*
        Do not save the exact ending position.
        Video ended event will mark lesson completed separately.
      */
      safeWatchPositionSeconds = Math.min(
        safeWatchPositionSeconds,
        Math.max(0, safeDurationSeconds - 3),
      );
    }

    const progressItem = await LessonProgress.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId,
        lessonId,
      },
      {
        $set: {
          watchPositionSeconds: safeWatchPositionSeconds,
          durationSeconds: safeDurationSeconds,
          lastWatchedAt: new Date(),
        },
        $setOnInsert: {
          isCompleted: false,
          completedAt: null,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Watch position saved.",
      watchPositionSeconds: progressItem.watchPositionSeconds || 0,
      durationSeconds: progressItem.durationSeconds || 0,
      isCompleted: progressItem.isCompleted || false,
      lastWatchedAt: progressItem.lastWatchedAt || null,
    });
  } catch (error) {
    console.error("SAVE_LESSON_WATCH_POSITION_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to save lesson watch position.",
    });
  }
};

export const markLessonProgress = updateLessonProgress;
export const markLessonComplete = updateLessonProgress;
