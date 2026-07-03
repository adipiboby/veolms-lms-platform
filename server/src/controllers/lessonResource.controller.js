import mongoose from "mongoose";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";

const AWS_S3_REGION = process.env.AWS_S3_REGION || "us-east-1";
const S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.S3_BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME;

const s3Client = new S3Client({
 region: AWS_S3_REGION,
});

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const sanitizeFileName = (fileName = "resource") => {
  const cleaned = String(fileName)
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 120);

  return cleaned || "resource";
};

const getFileType = ({ fileName = "", mimeType = "" }) => {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";

  if (
    lowerMime.includes("zip") ||
    lowerName.endsWith(".zip") ||
    lowerName.endsWith(".rar") ||
    lowerName.endsWith(".7z")
  ) {
    return "zip";
  }

  if (
    lowerMime.includes("word") ||
    lowerMime.includes("document") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx")
  ) {
    return "doc";
  }

  if (
    lowerMime.includes("powerpoint") ||
    lowerMime.includes("presentation") ||
    lowerName.endsWith(".ppt") ||
    lowerName.endsWith(".pptx")
  ) {
    return "ppt";
  }

  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.startsWith("video/")) return "video";
  if (lowerMime.startsWith("audio/")) return "audio";

  return "other";
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

const checkStudentEnrollment = async ({ userId, courseId }) => {
  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
  });

  return Boolean(enrollment);
};

const canAccessResource = async ({ req, courseId }) => {
  if (req.user?.role === "admin") return true;

  if (req.user?.role === "student") {
    return await checkStudentEnrollment({
      userId: req.user._id,
      courseId,
    });
  }

  return false;
};

const ensureBucketConfigured = () => {
  if (!S3_BUCKET_NAME) {
    const error = new Error("S3 bucket is not configured.");
    error.statusCode = 500;
    throw error;
  }
};

export const createLessonResourceUploadUrl = async (req, res) => {
  try {
    ensureBucketConfigured();

    const { courseId, lessonId, fileName, mimeType, size, title } = req.body;

    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or lesson id.",
      });
    }

    if (!fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        message: "File name and mime type are required.",
      });
    }

    const course = await Course.findById(courseId);

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

    const resourceId = new mongoose.Types.ObjectId();
    const safeFileName = sanitizeFileName(fileName);

    const fileKey = `lesson-resources/${courseId}/${lessonId}/${resourceId}-${safeFileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, uploadCommand, {
      expiresIn: 60 * 5,
    });

    const resource = {
      _id: resourceId,
      title: title?.trim() || fileName,
      fileName,
      fileKey,
      mimeType,
      size: Number(size || 0),
      type: getFileType({ fileName, mimeType }),
    };

    return res.status(200).json({
      success: true,
      uploadUrl,
      resource,
    });
  } catch (error) {
    console.error("CREATE_LESSON_RESOURCE_UPLOAD_URL_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create resource upload URL.",
    });
  }
};

export const saveLessonResource = async (req, res) => {
  try {
    const {
      courseId,
      lessonId,
      resourceId,
      title,
      fileName,
      fileKey,
      mimeType,
      size,
      type,
    } = req.body;

    if (!isValidObjectId(courseId) || !isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or lesson id.",
      });
    }

    if (!fileName || !fileKey || !mimeType) {
      return res.status(400).json({
        success: false,
        message: "Resource file data is required.",
      });
    }

    const expectedPrefix = `lesson-resources/${courseId}/${lessonId}/`;

    if (!fileKey.startsWith(expectedPrefix)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource file key.",
      });
    }

    const course = await Course.findById(courseId);

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

    const { lesson } = lessonData;

    const finalResourceId = isValidObjectId(resourceId)
      ? resourceId
      : new mongoose.Types.ObjectId();

    const alreadyExists = lesson.resources?.some((resource) => {
      return resource.fileKey === fileKey;
    });

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "This resource is already saved.",
      });
    }

    lesson.resources.push({
      _id: finalResourceId,
      title: title?.trim() || fileName,
      fileName,
      fileKey,
      mimeType,
      size: Number(size || 0),
      type: type || getFileType({ fileName, mimeType }),
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    await course.save();

    const savedResource = lesson.resources.find((resource) => {
      return resource._id.toString() === finalResourceId.toString();
    });

    return res.status(201).json({
      success: true,
      message: "Lesson resource saved successfully.",
      resource: savedResource,
    });
  } catch (error) {
    console.error("SAVE_LESSON_RESOURCE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save lesson resource.",
    });
  }
};

export const getLessonResourceDownloadUrl = async (req, res) => {
  try {
    ensureBucketConfigured();

    const { courseId, lessonId, resourceId } = req.params;

    if (
      !isValidObjectId(courseId) ||
      !isValidObjectId(lessonId) ||
      !isValidObjectId(resourceId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource request.",
      });
    }

    const hasAccess = await canAccessResource({
      req,
      courseId,
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this resource.",
      });
    }

    const course = await Course.findById(courseId);

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

    const resource = lessonData.lesson.resources?.find((item) => {
      return item._id.toString() === resourceId.toString();
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }

    const downloadCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: resource.fileKey,
      ResponseContentType: resource.mimeType,
      ResponseContentDisposition: `attachment; filename="${resource.fileName}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, downloadCommand, {
      expiresIn: 60 * 10,
    });

    return res.status(200).json({
      success: true,
      downloadUrl,
      resource,
    });
  } catch (error) {
    console.error("GET_LESSON_RESOURCE_DOWNLOAD_URL_ERROR:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create resource download URL.",
    });
  }
};

export const deleteLessonResource = async (req, res) => {
  try {
    ensureBucketConfigured();

    const { courseId, lessonId, resourceId } = req.params;

    if (
      !isValidObjectId(courseId) ||
      !isValidObjectId(lessonId) ||
      !isValidObjectId(resourceId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource request.",
      });
    }

    const course = await Course.findById(courseId);

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

    const { lesson } = lessonData;

    const resource = lesson.resources?.find((item) => {
      return item._id.toString() === resourceId.toString();
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }

    const fileKey = resource.fileKey;

    lesson.resources.pull(resource._id);

    await course.save();

    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: fileKey,
        }),
      );
    } catch (s3Error) {
      console.error("DELETE_RESOURCE_FROM_S3_ERROR:", s3Error);
    }

    return res.status(200).json({
      success: true,
      message: "Lesson resource deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_LESSON_RESOURCE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete lesson resource.",
    });
  }
};