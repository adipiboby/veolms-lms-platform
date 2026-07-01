import fs from "fs/promises";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { VideoAsset } from "../models/videoAsset.model.js";

import {
  abortMultipartUpload,
  buildVideoKey,
  completeMultipartUpload,
  createPresignedPartUploadUrl,
  createPresignedUploadUrl,
  initiateMultipartUpload,
  uploadVideoToS3,
} from "../services/s3.service.js";

import {
  buildHlsManifestKey,
  buildHlsOutputPrefix,
  createHlsMediaConvertJob,
  getMediaConvertJobStatus,
} from "../services/mediaconvert.service.js";

import {
  buildCloudFrontVideoUrl,
  createCloudFrontHlsSignedCookies,
  getHlsPrefixFromManifestKey,
  setCloudFrontCookiesOnResponse,
} from "../services/cloudfront.service.js";

import {
  createCloudFrontVideoSignedUrl,
  extractS3KeyFromUrl,
} from "../utils/cloudFrontVideo.util.js";

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const getBucketName = () => process.env.AWS_S3_BUCKET_NAME;
const getRegion = () => process.env.AWS_REGION || "us-east-1";

const isAdmin = (user) => user?.role === "admin";
const isStudent = (user) => user?.role === "student";

const findLessonById = (course, lessonId) => {
  for (const section of course.sections || []) {
    const lesson = section.lessons?.id?.(lessonId);

    if (lesson) {
      return lesson;
    }
  }

  return null;
};

const validateVideoMeta = ({ fileName, contentType, sizeBytes }) => {
  if (!fileName || !contentType || !sizeBytes) {
    return "fileName, contentType, and sizeBytes are required";
  }

  if (!allowedVideoTypes.includes(contentType)) {
    return "Only MP4, WebM, MOV, and MKV videos are allowed";
  }

  if (Number(sizeBytes) > MAX_VIDEO_SIZE_BYTES) {
    return "Video must be less than 500 MB";
  }

  return "";
};

const isOwnUploadKey = ({ key, user }) => {
  return String(key || "").includes(String(user?._id || ""));
};

const ensureVideoAssetOwner = ({ video, user }) => {
  if (!video || !user?._id) return false;

  return video.adminId?.toString() === user._id.toString();
};

const isExternalVideoUrl = (value = "") => {
  const cleanValue = String(value || "").trim();

  if (!cleanValue.startsWith("http://") && !cleanValue.startsWith("https://")) {
    return false;
  }

  return (
    cleanValue.includes("youtube.com") ||
    cleanValue.includes("youtu.be") ||
    cleanValue.includes("vimeo.com")
  );
};

const getLessonVideoKey = (lesson) => {
  const videoValue = lesson?.videoKey || lesson?.videoUrl || "";

  if (!videoValue) return "";

  if (isExternalVideoUrl(videoValue)) {
    return "";
  }

  if (
    String(videoValue).startsWith("http://") ||
    String(videoValue).startsWith("https://")
  ) {
    return extractS3KeyFromUrl(videoValue);
  }

  return videoValue;
};

const repairOldVideoAssetOwner = async ({ videoAsset, course, user }) => {
  if (!videoAsset || !course || !isAdmin(user)) return;

  const courseOwnerId = course.createdBy?.toString();
  const currentAdminId = user._id?.toString();

  if (!courseOwnerId || courseOwnerId !== currentAdminId) return;

  if (!videoAsset.adminId || videoAsset.adminId.toString() !== courseOwnerId) {
    videoAsset.adminId = course.createdBy;
    await videoAsset.save();
  }
};

const canManageCourseForVideo = async ({ req, courseId }) => {
  if (!courseId) {
    return {
      allowed: true,
      course: null,
    };
  }

  const course = await Course.findById(courseId);

  if (!course) {
    return {
      allowed: false,
      statusCode: 404,
      message: "Course not found",
      course: null,
    };
  }

  if (isAdmin(req.user)) {
    if (!course.createdBy) {
      course.createdBy = req.user._id;
      await course.save();
    }

    const isOwner = course.createdBy.toString() === req.user._id.toString();

    if (!isOwner) {
      return {
        allowed: false,
        statusCode: 403,
        message: "You can attach videos only to courses created by you",
        course,
      };
    }

    return {
      allowed: true,
      course,
    };
  }

  return {
    allowed: false,
    statusCode: 403,
    message: "Only admin can manage course videos",
    course,
  };
};

const canAccessCourseVideo = async ({ req, courseId }) => {
  const course = await Course.findById(courseId);

  if (!course) {
    return {
      allowed: false,
      statusCode: 404,
      message: "Course not found",
      course: null,
    };
  }

  /*
    ADMIN ACCESS:
    - Admin does not need payment/enrollment.
    - Admin can access only his own course.
    - If old course has no createdBy, auto-assign it to current admin.
  */
  if (isAdmin(req.user)) {
    if (!course.createdBy) {
      course.createdBy = req.user._id;
      await course.save();
    }

    const isOwner = course.createdBy.toString() === req.user._id.toString();

    if (!isOwner) {
      return {
        allowed: false,
        statusCode: 403,
        message: "You can access only videos from courses created by you",
        course,
      };
    }

    return {
      allowed: true,
      course,
      accessType: "adminOwner",
    };
  }

  /*
    STUDENT ACCESS:
    Student must be enrolled.
  */
  if (isStudent(req.user)) {
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (enrollment) {
      return {
        allowed: true,
        course,
        accessType: "student",
      };
    }
  }

  return {
    allowed: false,
    statusCode: 403,
    message: "You are not enrolled in this course",
    course,
  };
};

const startHlsProcessingForVideoAsset = async ({
  video,
  courseSlug = "course",
  courseId = "",
  lessonId = "",
}) => {
  const hlsOutputPrefix = buildHlsOutputPrefix({
    courseSlug,
    videoAssetId: video._id,
  });

  const hlsManifestKey = buildHlsManifestKey(hlsOutputPrefix);

  video.originalKey = video.originalKey || video.key;
  video.status = "processing";
  video.hlsStatus = "processing";
  video.hlsOutputPrefix = hlsOutputPrefix;
  video.hlsManifestKey = hlsManifestKey;
  video.processingError = "";

  await video.save();

  try {
    const job = await createHlsMediaConvertJob({
      inputKey: video.originalKey || video.key,
      hlsOutputPrefix,
      videoAssetId: video._id,
      courseId,
      lessonId,
    });

    video.mediaConvertJobId = job.jobId;
    video.mediaConvertJobStatus = job.jobStatus || "SUBMITTED";
    video.hlsOutputPrefix = job.hlsOutputPrefix;
    video.hlsManifestKey = job.hlsManifestKey;
    video.status = "processing";
    video.hlsStatus = "processing";
    video.processingError = "";

    await video.save();

    return video;
  } catch (error) {
    video.status = "failed";
    video.hlsStatus = "failed";
    video.processingError = error.message;

    await video.save();

    throw error;
  }
};

export const getSignedLessonVideoUrl = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "courseId and lessonId are required",
      });
    }

    const access = await canAccessCourseVideo({
      req,
      courseId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message: access.message || "You are not allowed to access this video",
      });
    }

    const course = access.course;
    const lesson = findLessonById(course, lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const rawVideoValue = lesson.videoKey || lesson.videoUrl || "";

    if (!rawVideoValue) {
      return res.status(404).json({
        success: false,
        message: "Lesson video is not available",
      });
    }

    if (isExternalVideoUrl(rawVideoValue)) {
      return res.status(200).json({
        success: true,
        videoUrl: rawVideoValue,
        playbackType: "external",
        accessType: access.accessType,
        expiresIn: null,
      });
    }

    const videoKey = getLessonVideoKey(lesson);

    if (!videoKey) {
      return res.status(404).json({
        success: false,
        message: "Lesson video key is missing",
      });
    }

    const videoAsset = await VideoAsset.findOne({
      $or: [
        { key: videoKey },
        { key: lesson.videoUrl },
        { key: lesson.videoKey },
      ],
    });

    await repairOldVideoAssetOwner({
      videoAsset,
      course,
      user: req.user,
    });

    const expiresIn = Number(
      process.env.CLOUDFRONT_VIDEO_SIGNED_URL_EXPIRES_IN || 3600,
    );

    const videoUrl = createCloudFrontVideoSignedUrl({
      key: videoKey,
      expiresInSeconds: expiresIn,
    });

    return res.status(200).json({
      success: true,
      videoUrl,
      playbackType: "cloudfront",
      accessType: access.accessType,
      expiresIn,
    });
  } catch (error) {
    console.error("SIGNED_VIDEO_URL_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create CloudFront signed video URL",
      error: error.message,
    });
  }
};

export const getHlsLessonAccess = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "courseId and lessonId are required",
      });
    }

    const access = await canAccessCourseVideo({
      req,
      courseId,
    });

    if (!access.allowed) {
      return res.status(access.statusCode || 403).json({
        success: false,
        message:
          access.message || "You are not allowed to access this HLS video",
      });
    }

    const course = access.course;
    const lesson = findLessonById(course, lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    let hlsManifestKey =
      lesson.hlsManifestKey || lesson.videoHlsManifestKey || "";

    let hlsOutputPrefix = lesson.hlsOutputPrefix || "";

    if (!hlsManifestKey && lesson.videoUrl) {
      const videoAsset = await VideoAsset.findOne({
        key: lesson.videoUrl,
      });

      if (!videoAsset) {
        return res.status(404).json({
          success: false,
          message: "Video asset not found for this lesson",
        });
      }

      await repairOldVideoAssetOwner({
        videoAsset,
        course,
        user: req.user,
      });

      if (videoAsset.hlsStatus === "failed") {
        return res.status(409).json({
          success: false,
          message: "Video processing failed",
          error: videoAsset.processingError || "",
        });
      }

      if (videoAsset.hlsStatus !== "ready") {
        return res.status(202).json({
          success: false,
          message: "Video is still processing. Please try again shortly.",
          status: videoAsset.hlsStatus,
          mediaConvertJobStatus: videoAsset.mediaConvertJobStatus,
        });
      }

      hlsManifestKey = videoAsset.hlsManifestKey;
      hlsOutputPrefix = videoAsset.hlsOutputPrefix;
    }

    if (!hlsManifestKey) {
      return res.status(404).json({
        success: false,
        message: "Lesson HLS video is not available",
      });
    }

    if (!hlsManifestKey.endsWith(".m3u8")) {
      return res.status(409).json({
        success: false,
        message: "Video is not converted to HLS yet",
      });
    }

    if (!hlsOutputPrefix) {
      hlsOutputPrefix = getHlsPrefixFromManifestKey(hlsManifestKey);
    }

    const signedCookieData = createCloudFrontHlsSignedCookies({
      hlsOutputPrefix,
    });

    setCloudFrontCookiesOnResponse({
      res,
      cookies: signedCookieData.cookies,
      maxAgeMs: signedCookieData.maxAgeMs,
    });

    const manifestUrl = buildCloudFrontVideoUrl(hlsManifestKey);

    return res.status(200).json({
      success: true,
      message: "HLS access granted",
      manifestUrl,
      accessType: access.accessType,
      expiresAt: signedCookieData.expiresAt,
    });
  } catch (error) {
    console.error("GET_HLS_LESSON_ACCESS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create HLS video access",
      error: error.message,
    });
  }
};

export const createAdminVideoUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType, sizeBytes, courseSlug } = req.body;

    const validationMessage = validateVideoMeta({
      fileName,
      contentType,
      sizeBytes,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const key = buildVideoKey({
      adminId: req.user._id,
      courseSlug,
      originalName: fileName,
    });

    const uploadUrl = await createPresignedUploadUrl({
      key,
      contentType,
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
      bucket: getBucketName(),
      region: getRegion(),
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error("CREATE_PRESIGNED_UPLOAD_URL_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create upload URL",
      error: error.message,
    });
  }
};

export const confirmAdminVideoUpload = async (req, res) => {
  try {
    const {
      key,
      originalName,
      mimeType,
      sizeBytes,
      courseSlug,
      courseId,
      lessonId,
    } = req.body;

    if (!key || !originalName || !mimeType || !sizeBytes) {
      return res.status(400).json({
        success: false,
        message: "key, originalName, mimeType, and sizeBytes are required",
      });
    }

    const validationMessage = validateVideoMeta({
      fileName: originalName,
      contentType: mimeType,
      sizeBytes,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    if (!isOwnUploadKey({ key, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can confirm only videos uploaded by you",
      });
    }

    const courseAccess = await canManageCourseForVideo({
      req,
      courseId,
    });

    if (!courseAccess.allowed) {
      return res.status(courseAccess.statusCode || 403).json({
        success: false,
        message: courseAccess.message,
      });
    }

    let video = await VideoAsset.findOne({ key });

    if (video && !ensureVideoAssetOwner({ video, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can confirm only videos uploaded by you",
      });
    }

    if (!video) {
      video = await VideoAsset.create({
        adminId: req.user._id,
        key,
        originalKey: key,
        originalName,
        bucket: getBucketName(),
        region: getRegion(),
        mimeType,
        sizeBytes,
        sourceType: "s3",
        status: "uploaded",
        hlsStatus: "not_started",
      });
    }

    if (video.hlsStatus === "ready" || video.hlsStatus === "processing") {
      return res.status(200).json({
        success: true,
        message: "Video already confirmed",
        video,
      });
    }

    video = await startHlsProcessingForVideoAsset({
      video,
      courseSlug,
      courseId,
      lessonId,
    });

    return res.status(201).json({
      success: true,
      message: "Video upload confirmed and HLS processing started",
      video,
    });
  } catch (error) {
    console.error("CONFIRM_VIDEO_UPLOAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Video uploaded, but failed to start HLS processing",
      error: error.message,
    });
  }
};

export const initiateAdminMultipartUpload = async (req, res) => {
  try {
    const { fileName, contentType, sizeBytes, courseSlug } = req.body;

    const validationMessage = validateVideoMeta({
      fileName,
      contentType,
      sizeBytes,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const key = buildVideoKey({
      adminId: req.user._id,
      courseSlug,
      originalName: fileName,
    });

    const multipart = await initiateMultipartUpload({
      key,
      contentType,
    });

    return res.status(200).json({
      success: true,
      uploadId: multipart.uploadId,
      key: multipart.key,
      bucket: multipart.bucket,
      region: multipart.region,
    });
  } catch (error) {
    console.error("INITIATE_MULTIPART_UPLOAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to initiate multipart upload",
      error: error.message,
    });
  }
};

export const getAdminMultipartPartUrl = async (req, res) => {
  try {
    const { key, uploadId, partNumber } = req.body;

    if (!key || !uploadId || !partNumber) {
      return res.status(400).json({
        success: false,
        message: "key, uploadId, and partNumber are required",
      });
    }

    if (!isOwnUploadKey({ key, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can upload parts only for your own video",
      });
    }

    const uploadUrl = await createPresignedPartUploadUrl({
      key,
      uploadId,
      partNumber,
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
      partNumber: Number(partNumber),
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error("PRESIGN_MULTIPART_PART_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create part upload URL",
      error: error.message,
    });
  }
};

export const completeAdminMultipartUpload = async (req, res) => {
  try {
    const {
      key,
      uploadId,
      parts,
      originalName,
      mimeType,
      sizeBytes,
      courseSlug,
      courseId,
      lessonId,
    } = req.body;

    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "key, uploadId, and parts are required",
      });
    }

    if (!originalName || !mimeType || !sizeBytes) {
      return res.status(400).json({
        success: false,
        message: "originalName, mimeType, and sizeBytes are required",
      });
    }

    const validationMessage = validateVideoMeta({
      fileName: originalName,
      contentType: mimeType,
      sizeBytes,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    if (!isOwnUploadKey({ key, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can complete only your own video upload",
      });
    }

    const courseAccess = await canManageCourseForVideo({
      req,
      courseId,
    });

    if (!courseAccess.allowed) {
      return res.status(courseAccess.statusCode || 403).json({
        success: false,
        message: courseAccess.message,
      });
    }

    const normalizedParts = parts
      .map((part) => ({
        PartNumber: Number(part.PartNumber),
        ETag: part.ETag,
      }))
      .filter((part) => part.PartNumber && part.ETag)
      .sort((a, b) => a.PartNumber - b.PartNumber);

    if (normalizedParts.length !== parts.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid uploaded parts data",
      });
    }

    let video = await VideoAsset.findOne({ key });

    if (video && !ensureVideoAssetOwner({ video, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can complete only videos uploaded by you",
      });
    }

    await completeMultipartUpload({
      key,
      uploadId,
      parts: normalizedParts,
    });

    if (!video) {
      video = await VideoAsset.create({
        adminId: req.user._id,
        key,
        originalKey: key,
        originalName,
        bucket: getBucketName(),
        region: getRegion(),
        mimeType,
        sizeBytes,
        sourceType: "s3",
        status: "uploaded",
        hlsStatus: "not_started",
      });
    }

    let hlsStarted = false;
    let hlsError = "";

    if (video.hlsStatus !== "processing" && video.hlsStatus !== "ready") {
      try {
        video = await startHlsProcessingForVideoAsset({
          video,
          courseSlug,
          courseId,
          lessonId,
        });

        hlsStarted = true;
      } catch (error) {
        hlsError = error.message;

        video.status = "uploaded";
        video.hlsStatus = "failed";
        video.processingError = error.message;

        await video.save();

        console.warn("HLS processing skipped/failed:", error.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: hlsStarted
        ? "Multipart upload completed and HLS processing started"
        : "Multipart upload completed. HLS processing can be retried later.",
      hlsStarted,
      hlsError,
      video,
    });
  } catch (error) {
    console.error("COMPLETE_MULTIPART_UPLOAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete multipart upload",
      error: error.message,
    });
  }
};

export const abortAdminMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId } = req.body;

    if (!key || !uploadId) {
      return res.status(400).json({
        success: false,
        message: "key and uploadId are required",
      });
    }

    if (!isOwnUploadKey({ key, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can abort only your own video upload",
      });
    }

    await abortMultipartUpload({
      key,
      uploadId,
    });

    return res.status(200).json({
      success: true,
      message: "Multipart upload aborted successfully",
    });
  } catch (error) {
    console.error("ABORT_MULTIPART_UPLOAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to abort multipart upload",
      error: error.message,
    });
  }
};

export const uploadAdminVideo = async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    const validationMessage = validateVideoMeta({
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    filePath = req.file.path;

    const key = buildVideoKey({
      adminId: req.user._id,
      originalName: req.file.originalname,
    });

    await uploadVideoToS3({
      filePath: req.file.path,
      key,
      contentType: req.file.mimetype,
    });

    let video = await VideoAsset.create({
      adminId: req.user._id,
      key,
      originalKey: key,
      originalName: req.file.originalname,
      bucket: getBucketName(),
      region: getRegion(),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sourceType: "s3",
      status: "uploaded",
      hlsStatus: "not_started",
    });

    video = await startHlsProcessingForVideoAsset({
      video,
      courseSlug: "course",
    });

    return res.status(201).json({
      success: true,
      message: "Video uploaded and HLS processing started",
      video,
    });
  } catch (error) {
    console.error("UPLOAD_VIDEO_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload video",
      error: error.message,
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
};

export const startAdminHlsProcessing = async (req, res) => {
  try {
    const { videoId } = req.params;

    const {
      courseSlug = "course",
      courseId = "",
      lessonId = "",
    } = req.body || {};

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "videoId is required",
      });
    }

    let video = await VideoAsset.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video asset not found",
      });
    }

    if (!ensureVideoAssetOwner({ video, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can process only videos uploaded by you",
      });
    }

    const courseAccess = await canManageCourseForVideo({
      req,
      courseId,
    });

    if (!courseAccess.allowed) {
      return res.status(courseAccess.statusCode || 403).json({
        success: false,
        message: courseAccess.message,
      });
    }

    if (video.hlsStatus === "processing") {
      return res.status(200).json({
        success: true,
        message: "HLS processing already started",
        video,
      });
    }

    if (video.hlsStatus === "ready") {
      return res.status(200).json({
        success: true,
        message: "HLS processing already completed",
        video,
      });
    }

    if (!video.originalKey) {
      video.originalKey = video.key;
      await video.save();
    }

    video = await startHlsProcessingForVideoAsset({
      video,
      courseSlug,
      courseId,
      lessonId,
    });

    return res.status(200).json({
      success: true,
      message: "HLS processing started successfully",
      video,
    });
  } catch (error) {
    console.error("START_HLS_PROCESSING_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start HLS processing",
      error: error.message,
    });
  }
};

export const getAdminMediaConvertJobStatus = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "videoId is required",
      });
    }

    const video = await VideoAsset.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video asset not found",
      });
    }

    if (!ensureVideoAssetOwner({ video, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "You can check only videos uploaded by you",
      });
    }

    if (!video.mediaConvertJobId) {
      return res.status(400).json({
        success: false,
        message: "MediaConvert job not started for this video",
      });
    }

    const job = await getMediaConvertJobStatus(video.mediaConvertJobId);

    video.mediaConvertJobStatus = job.status;

    if (job.status === "COMPLETE") {
      video.status = "ready";
      video.hlsStatus = "ready";
      video.processingError = "";
      video.processedAt = new Date();
    }

    if (job.status === "ERROR" || job.status === "CANCELED") {
      video.status = "failed";
      video.hlsStatus = "failed";
      video.processingError =
        job.errorMessage || job.errorCode || "MediaConvert job failed";
    }

    await video.save();

    return res.status(200).json({
      success: true,
      message: "MediaConvert job status updated",
      video,
      job,
    });
  } catch (error) {
    console.error("GET_MEDIACONVERT_JOB_STATUS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check MediaConvert job status",
      error: error.message,
    });
  }
};

export const getAdminStorageOverview = async (req, res) => {
  try {
    const videos = await VideoAsset.find({
      adminId: req.user._id,
      status: {
        $in: ["uploaded", "processing", "ready", "failed"],
      },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = await VideoAsset.aggregate([
      {
        $match: {
          adminId: req.user._id,
          status: {
            $in: ["uploaded", "processing", "ready"],
          },
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

    const overview = stats[0] || {
      totalVideos: 0,
      totalStorageBytes: 0,
    };

    return res.status(200).json({
      success: true,
      overview: {
        totalVideos: overview.totalVideos,
        totalStorageBytes: overview.totalStorageBytes,
        totalStorageMB: Number(
          (overview.totalStorageBytes / 1024 / 1024).toFixed(2),
        ),
        totalStorageGB: Number(
          (overview.totalStorageBytes / 1024 / 1024 / 1024).toFixed(3),
        ),
      },
      recentVideos: videos,
    });
  } catch (error) {
    console.error("ADMIN_STORAGE_OVERVIEW_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load storage overview",
      error: error.message,
    });
  }
};
