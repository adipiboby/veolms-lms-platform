import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { LessonProgress } from "../models/lessonProgress.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

    const progressItem = await LessonProgress.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId,
        lessonId,
      },
      {
        $set: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
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

    return res.status(500).json({
      success: false,
      message: "Failed to update lesson progress.",
    });
  }
};

export const markLessonProgress = updateLessonProgress;
export const markLessonComplete = updateLessonProgress;