import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { LessonProgress } from "../models/lessonProgress.model.js";

const getAllLessons = (course) => {
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      lessonId: lesson._id,
      lessonTitle: lesson.title,
      sectionTitle: section.title,
    }))
  );
};

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    const allLessons = getAllLessons(course);

    const lessonProgress = await LessonProgress.find({
      userId: req.user._id,
      courseId: course._id,
    }).sort({ lastWatchedAt: -1 });

    const completedLessons = lessonProgress.filter(
      (item) => item.isCompleted
    ).length;

    const totalLessons = allLessons.length;

    const progressPercentage =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    res.status(200).json({
      success: true,
      totalLessons,
      completedLessons,
      progressPercentage,
      currentLessonId: lessonProgress[0]?.lessonId || null,
      lessonProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      error: error.message,
    });
  }
};

export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId, isCompleted = false } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "Course ID and Lesson ID are required",
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
      courseId: course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    let selectedLesson = null;

    for (const section of course.sections) {
      const lesson = section.lessons.find(
        (lesson) => lesson._id.toString() === lessonId
      );

      if (lesson) {
        selectedLesson = {
          lessonId: lesson._id,
          lessonTitle: lesson.title,
          sectionTitle: section.title,
        };
        break;
      }
    }

    if (!selectedLesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course",
      });
    }

    const existingProgress = await LessonProgress.findOne({
      userId: req.user._id,
      courseId: course._id,
      lessonId: selectedLesson.lessonId,
    });

    const progress = await LessonProgress.findOneAndUpdate(
      {
        userId: req.user._id,
        courseId: course._id,
        lessonId: selectedLesson.lessonId,
      },
      {
        userId: req.user._id,
        courseId: course._id,
        lessonId: selectedLesson.lessonId,
        lessonTitle: selectedLesson.lessonTitle,
        sectionTitle: selectedLesson.sectionTitle,
        isCompleted: isCompleted ? true : existingProgress?.isCompleted || false,
        lastWatchedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update progress",
      error: error.message,
    });
  }
};