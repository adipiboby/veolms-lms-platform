import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";

export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate({
        path: "courseId",
        select:
          "title slug shortDescription thumbnail instructorName price category level sections",
      })
      .sort({ createdAt: -1 });

    const courses = enrollments
      .filter((enrollment) => enrollment.courseId)
      .map((enrollment) => ({
        enrollmentId: enrollment._id,
        enrolledAt: enrollment.enrolledAt,
        course: enrollment.courseId,
      }));

    res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
      error: error.message,
    });
  }
};

export const getLearningCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({
      slug,
      isPublished: true,
    });

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

    res.status(200).json({
      success: true,
      course,
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch learning course",
      error: error.message,
    });
  }
};