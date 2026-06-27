import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { LessonProgress } from "../models/lessonProgress.model.js";

export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate({
        path: "courseId",
        select:
          "title slug shortDescription thumbnail instructorName price category level sections",
      })
      .sort({ createdAt: -1 });

    const validEnrollments = enrollments.filter(
      (enrollment) => enrollment.courseId,
    );

    const courseIds = validEnrollments.map(
      (enrollment) => enrollment.courseId._id,
    );

    const completedProgress = await LessonProgress.find({
      userId: req.user._id,
      courseId: { $in: courseIds },
      isCompleted: true,
    }).select("courseId lessonId");

    const completedCountByCourse = completedProgress.reduce((acc, item) => {
      const courseId = item.courseId.toString();

      acc[courseId] = (acc[courseId] || 0) + 1;

      return acc;
    }, {});

    const courses = validEnrollments.map((enrollment) => {
      const course = enrollment.courseId;

      const totalLessons =
        course.sections?.reduce((courseTotal, section) => {
          return courseTotal + (section.lessons?.length || 0);
        }, 0) || 0;

      const completedLessons =
        completedCountByCourse[course._id.toString()] || 0;

      const progressPercentage =
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100);

      return {
        enrollmentId: enrollment._id,
        enrolledAt: enrollment.enrolledAt,
        course,
        progress: {
          totalLessons,
          completedLessons,
          progressPercentage,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
      error: error.message,
    });
  }
};

export const getLearningCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = { slug };

    // Student should access only published courses.
    // Admin can preview his own course even if draft.
    if (req.user.role === "student") {
      query.isPublished = true;
    }

    const course = await Course.findOne(query);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
      ADMIN ACCESS RULE:

      1. If course already has createdBy:
         admin can access only if createdBy === logged-in admin id.

      2. If course has no createdBy:
         this is an old course, so we auto-assign it to the logged-in admin.
         This avoids using mongosh password.
    */
    if (req.user.role === "admin") {
      if (!course.createdBy) {
        course.createdBy = req.user._id;
        await course.save();
      }

      const isAdminOwner =
        course.createdBy.toString() === req.user._id.toString();

      if (!isAdminOwner) {
        return res.status(403).json({
          success: false,
          message: "You can access only courses created by you",
        });
      }

      return res.status(200).json({
        success: true,
        course,
        enrollment: null,
        accessType: "adminOwner",
      });
    }

    /*
      STUDENT ACCESS RULE:
      Student must be enrolled.
    */
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

    return res.status(200).json({
      success: true,
      course,
      enrollment,
      accessType: "student",
    });
  } catch (error) {
    console.error("GET_LEARNING_COURSE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch learning course",
      error: error.message,
    });
  }
};

export const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });

    return res.status(200).json({
      success: true,
      isEnrolled: Boolean(enrollment),
      enrollment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check enrollment status",
      error: error.message,
    });
  }
};
