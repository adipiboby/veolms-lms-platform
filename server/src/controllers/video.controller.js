import fs from "fs/promises";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import {
  createSignedVideoUrl,
  uploadVideoToS3,
} from "../services/s3.service.js";

import { VideoAsset } from "../models/videoAsset.model.js";
const isExternalUrl = (value = "") => {
  return value.startsWith("http://") || value.startsWith("https://");
};

const createSafeS3Key = ({ adminId, originalName }) => {
  const safeName = originalName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return `courses/videos/admin-${adminId}/${Date.now()}-${safeName}`;
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
        (lesson) => lesson._id.toString() === lessonId,
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

    if (isExternalUrl(videoValue)) {
      return res.status(200).json({
        success: true,
        sourceType: "external",
        videoUrl: videoValue,
      });
    }

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

export const uploadAdminVideo = async (req, res) => {
  let tempFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    tempFilePath = req.file.path;

    const key = createSafeS3Key({
      adminId: req.user._id.toString(),
      originalName: req.file.originalname,
    });

    await uploadVideoToS3({
      filePath: tempFilePath,
      key,
      contentType: req.file.mimetype,
    });
    await VideoAsset.create({
      adminId: req.user._id,
      key,
      originalName: req.file.originalname,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    await fs.unlink(tempFilePath);

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      key,
      videoSource: key,
    });
  } catch (error) {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload video",
      error: error.message,
    });
  }
};

export const getAdminStorageOverview = async (req, res) => {
  try {
    const stats = await VideoAsset.aggregate([
      {
        $match: {
          adminId: req.user._id,
          status: "uploaded",
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalStorageBytes: { $sum: "$sizeBytes" },
        },
      },
    ]);

    const recentVideos = await VideoAsset.find({
      adminId: req.user._id,
      status: "uploaded",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalVideos = stats[0]?.totalVideos || 0;
    const totalStorageBytes = stats[0]?.totalStorageBytes || 0;

    res.status(200).json({
      success: true,
      overview: {
        totalVideos,
        totalStorageBytes,
        totalStorageMB: Number((totalStorageBytes / (1024 * 1024)).toFixed(2)),
        totalStorageGB: Number(
          (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(3)
        ),
      },
      recentVideos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch storage overview",
      error: error.message,
    });
  }
};