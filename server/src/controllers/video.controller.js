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
  createSignedVideoUrl,
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

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const getBucketName = () => process.env.AWS_S3_BUCKET_NAME;
const getRegion = () => process.env.AWS_REGION || "us-east-1";

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

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const lesson = findLessonById(course, lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!lesson.videoUrl) {
      return res.status(404).json({
        success: false,
        message: "Lesson video is not available",
      });
    }

    const videoUrl = await createSignedVideoUrl(lesson.videoUrl);

    return res.status(200).json({
      success: true,
      videoUrl,
      expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRES_IN || 600),
    });
  } catch (error) {
    console.error("SIGNED_VIDEO_URL_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create signed video URL",
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

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const lesson = findLessonById(course, lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    let hlsManifestKey = lesson.hlsManifestKey || lesson.videoHlsManifestKey || "";
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

    let video = await VideoAsset.findOne({ key });

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

    await completeMultipartUpload({
      key,
      uploadId,
      parts: normalizedParts,
    });

    let video = await VideoAsset.findOne({ key });

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

    // Try MediaConvert only if AWS account supports it.
    // If it fails, upload should still be successful.
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
    const { courseSlug = "course", courseId = "", lessonId = "" } = req.body || {};

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
      status: {
        $in: ["uploaded", "processing", "ready", "failed"],
      },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = await VideoAsset.aggregate([
      {
        $match: {
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
          (overview.totalStorageBytes / 1024 / 1024).toFixed(2)
        ),
        totalStorageGB: Number(
          (overview.totalStorageBytes / 1024 / 1024 / 1024).toFixed(3)
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