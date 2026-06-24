import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { createSignedVideoUrl } from "../services/s3.service.js";

const isExternalUrl = (value = "") => {
  return value.startsWith("http://") || value.startsWith("https://");
};

export const getSignedLessonVideoUrl = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

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
        selectedLesson = lesson;
        break;
      }
    }

    if (!selectedLesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const videoValue = selectedLesson.videoUrl;

    if (!videoValue) {
      return res.status(400).json({
        success: false,
        message: "Video source not found for this lesson",
      });
    }

    // YouTube or normal external URL fallback
    if (isExternalUrl(videoValue)) {
      return res.status(200).json({
        success: true,
        sourceType: "external",
        videoUrl: videoValue,
      });
    }

    // Private S3 object key
    const signedUrl = await createSignedVideoUrl(videoValue);

    res.status(200).json({
      success: true,
      sourceType: "s3",
      videoUrl: signedUrl,
      expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRES_IN) || 600,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate signed video URL",
      error: error.message,
    });
  }
};