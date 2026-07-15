import crypto from "crypto";

import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { VideoAsset } from "../models/videoAsset.model.js";

import {
  abortMultipartUpload,
  completeMultipartUpload,
  createPresignedPartUploadUrl,
  createPresignedUploadUrl,
  deleteS3Object,
  deleteS3ObjectsByPrefix,
  initiateMultipartUpload,
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
  getCloudFrontHlsMode,
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

const getRegion = () => process.env.AWS_S3_REGION || "us-east-1";

const getCloudFrontExpiresIn = () => {
  return Number(process.env.CLOUDFRONT_VIDEO_SIGNED_URL_EXPIRES_IN) || 3600;
};

const isAdmin = (user) => user?.role === "admin";
const isStudent = (user) => user?.role === "student";

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const isSameId = (a, b) => {
  if (!a || !b) return false;

  return String(a) === String(b);
};

const sanitizeS3PathSegment = (value = "", fallback = "item") => {
  const clean = String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .toLowerCase();

  return clean || fallback;
};

const buildUniqueVideoKey = ({
  adminId,
  courseSlug = "",
  courseId = "",
  lessonId = "",
  originalName = "video.mp4",
}) => {
  const safeAdminId = sanitizeS3PathSegment(adminId, "unknown-admin");

  const safeCourseFolder = sanitizeS3PathSegment(
    courseSlug || (courseId ? `course-${courseId}` : "course"),
    "course",
  );

  const safeLessonFolder = sanitizeS3PathSegment(
    lessonId ? `lesson-${lessonId}` : "lesson-unassigned",
    "lesson-unassigned",
  );

  const safeFileName = sanitizeS3PathSegment(originalName, "video.mp4");
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();

  return `videos/admin-${safeAdminId}/${safeCourseFolder}/${safeLessonFolder}/video-${timestamp}-${randomId}-${safeFileName}`;
};

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
  const userId = user?._id || user?.id;

  if (!key || !userId) return false;

  return String(key).includes(String(userId));
};

const ensureVideoAssetOwner = ({ video, user }) => {
  const userId = user?._id || user?.id;

  if (!video || !userId) return false;

  return String(video.adminId) === String(userId);
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

const findAdminVideoUpload = async ({ req, key, uploadId }) => {
  const adminId = getUserId(req);

  if (!adminId || !key) return null;

  const video = await VideoAsset.findOne({
    key,
    adminId,
  });

  if (!video) return null;

  if (
    video.uploadId &&
    uploadId &&
    String(video.uploadId) !== String(uploadId)
  ) {
    return null;
  }

  return video;
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
      course.createdBy = getUserId(req);
      await course.save();
    }

    const isOwner = String(course.createdBy) === String(getUserId(req));

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

  if (isAdmin(req.user)) {
    if (!course.createdBy) {
      course.createdBy = getUserId(req);
      await course.save();
    }

    const isOwner = String(course.createdBy) === String(getUserId(req));

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

  if (isStudent(req.user)) {
    const enrollment = await Enrollment.findOne({
      userId: getUserId(req),
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

const getLessonVideoKey = ({ lesson, videoAsset }) => {
  return (
    lesson?.videoKey ||
    lesson?.videoS3Key ||
    videoAsset?.key ||
    videoAsset?.originalKey ||
    extractS3KeyFromUrl(lesson?.videoUrl) ||
    lesson?.videoUrl ||
    ""
  );
};

const createSignedCloudFrontPlaybackUrl = ({ key }) => {
  return createCloudFrontVideoSignedUrl({
    key,
    expiresInSeconds: getCloudFrontExpiresIn(),
  });
};

const uniqueValues = (values = []) => {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => Boolean(value)),
    ),
  ];
};

const getLessonVideoSnapshot = (lesson) => {
  if (!lesson) return null;

  return {
    videoUrl: lesson.videoUrl || "",
    videoKey: lesson.videoKey || "",
    videoAssetId: lesson.videoAssetId || null,
    hlsManifestKey: lesson.hlsManifestKey || "",
    hlsOutputPrefix: lesson.hlsOutputPrefix || "",
  };
};

const clearLessonVideoFields = (lesson) => {
  if (!lesson) return;

  lesson.videoUrl = "";
  lesson.videoKey = "";
  lesson.videoAssetId = null;
  lesson.hlsManifestKey = "";
  lesson.hlsOutputPrefix = "";
  lesson.originalVideoName = "";
  lesson.mimeType = "";
  lesson.sizeBytes = 0;
  lesson.duration = "";
  lesson.durationSeconds = 0;
};

const findVideoAssetForSnapshot = async (snapshot) => {
  if (!snapshot) return null;

  if (snapshot.videoAssetId) {
    const videoById = await VideoAsset.findById(snapshot.videoAssetId);

    if (videoById) return videoById;
  }

  const possibleKeys = uniqueValues([snapshot.videoKey, snapshot.videoUrl]);

  if (possibleKeys.length === 0) return null;

  return VideoAsset.findOne({
    key: {
      $in: possibleKeys,
    },
  });
};

const isVideoReferencedByAnyLesson = async ({ videoAsset, snapshot }) => {
  if (!videoAsset && !snapshot) return false;

  const possibleIds = uniqueValues([videoAsset?._id, snapshot?.videoAssetId]);

  const possibleKeys = uniqueValues([
    videoAsset?.key,
    videoAsset?.originalKey,
    snapshot?.videoKey,
    snapshot?.videoUrl,
  ]);

  const orConditions = [];

  if (possibleIds.length > 0) {
    orConditions.push({
      "sections.lessons.videoAssetId": {
        $in: possibleIds,
      },
    });
  }

  if (possibleKeys.length > 0) {
    orConditions.push({
      "sections.lessons.videoUrl": {
        $in: possibleKeys,
      },
    });

    orConditions.push({
      "sections.lessons.videoKey": {
        $in: possibleKeys,
      },
    });
  }

  if (orConditions.length === 0) return false;

  const existingCourse = await Course.findOne({
    $or: orConditions,
  }).select("_id");

  return Boolean(existingCourse);
};

const deleteVideoStorageAndAsset = async ({ videoAsset, snapshot }) => {
  const keysToDelete = uniqueValues([
    videoAsset?.key,
    videoAsset?.originalKey,
    snapshot?.videoKey,
    snapshot?.videoUrl,
  ]);

  for (const key of keysToDelete) {
    await deleteS3Object(key).catch((error) => {
      console.warn("DELETE_VIDEO_OBJECT_WARNING:", key, error.message);
    });
  }

  const prefixesToDelete = uniqueValues([
    videoAsset?.hlsOutputPrefix,
    snapshot?.hlsOutputPrefix,
  ]);

  for (const prefix of prefixesToDelete) {
    await deleteS3ObjectsByPrefix(prefix).catch((error) => {
      console.warn("DELETE_HLS_PREFIX_WARNING:", prefix, error.message);
    });
  }

  if (videoAsset?._id) {
    await VideoAsset.findByIdAndDelete(videoAsset._id).catch((error) => {
      console.warn("DELETE_VIDEO_ASSET_WARNING:", error.message);
    });
  }
};

const cleanupOldLessonVideoAfterReplace = async ({ oldSnapshot }) => {
  if (!oldSnapshot) return;

  const oldVideoAsset = await findVideoAssetForSnapshot(oldSnapshot);

  const stillReferenced = await isVideoReferencedByAnyLesson({
    videoAsset: oldVideoAsset,
    snapshot: oldSnapshot,
  });

  if (stillReferenced) return;

  await deleteVideoStorageAndAsset({
    videoAsset: oldVideoAsset,
    snapshot: oldSnapshot,
  });
};

const syncCourseLessonVideoAfterUpload = async ({
  req,
  courseId,
  lessonId,
  video,
  originalName = "",
  mimeType = "",
  sizeBytes = 0,
  displayTitle = "",
  duration = "",
  durationSeconds = 0,
}) => {
  if (!courseId || !lessonId || !video?._id) return;

  const course = await Course.findById(courseId);

  if (!course) return;

  const adminId = getUserId(req);

  if (course.createdBy && !isSameId(course.createdBy, adminId)) {
    return;
  }

  if (!course.createdBy) {
    course.createdBy = adminId;
  }

  const lesson = findLessonById(course, lessonId);

  if (!lesson) return;

  const oldSnapshot = getLessonVideoSnapshot(lesson);

  lesson.videoUrl = video.key;
  lesson.videoKey = video.key;
  lesson.videoAssetId = video._id;
  lesson.hlsManifestKey = video.hlsManifestKey || lesson.hlsManifestKey || "";
  lesson.hlsOutputPrefix =
    video.hlsOutputPrefix || lesson.hlsOutputPrefix || "";
  lesson.originalVideoName =
    originalName || video.originalName || lesson.originalVideoName || "";
  lesson.mimeType = mimeType || video.mimeType || lesson.mimeType || "";
  lesson.sizeBytes = Number(
    sizeBytes || video.sizeBytes || lesson.sizeBytes || 0,
  );
  lesson.duration = duration || video.duration || lesson.duration || "";
  lesson.durationSeconds = Number(
    durationSeconds || video.durationSeconds || lesson.durationSeconds || 0,
  );

  if (!lesson.title && displayTitle) {
    lesson.title = displayTitle;
  }

  await course.save();

  await cleanupOldLessonVideoAfterReplace({
    oldSnapshot,
  });
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

    if (!lesson.videoUrl && !lesson.videoKey && !lesson.videoAssetId) {
      return res.status(404).json({
        success: false,
        message: "Lesson video is not available",
      });
    }

    let videoAsset = null;

    if (lesson.videoAssetId) {
      videoAsset = await VideoAsset.findById(lesson.videoAssetId);
    }

    if (!videoAsset && (lesson.videoKey || lesson.videoUrl)) {
      videoAsset = await VideoAsset.findOne({
        key: lesson.videoKey || lesson.videoUrl,
      });
    }

    await repairOldVideoAssetOwner({
      videoAsset,
      course,
      user: req.user,
    });

    const videoKey = getLessonVideoKey({
      lesson,
      videoAsset,
    });

    if (!videoKey) {
      return res.status(400).json({
        success: false,
        message: "Video key is missing for this lesson.",
      });
    }

    const videoUrl = createSignedCloudFrontPlaybackUrl({
      key: videoKey,
    });

    const expiresIn = getCloudFrontExpiresIn();

    return res.status(200).json({
      success: true,
      message: "CloudFront signed video URL created",
      videoUrl,
      signedUrl: videoUrl,
      url: videoUrl,
      key: videoKey,
      type: "mp4",
      source: "cloudfront",
      sourceType: "cloudfront",
      accessType: access.accessType,
      expiresIn,
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

// Replace only the existing getHlsLessonAccess function in:
// server/src/controllers/video.controller.js
// Keep your existing imports and helper functions.

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

    let videoAsset = null;

    if (lesson.videoAssetId) {
      videoAsset = await VideoAsset.findById(lesson.videoAssetId);
    }

    if (!videoAsset && (lesson.videoKey || lesson.videoUrl)) {
      videoAsset = await VideoAsset.findOne({
        key: lesson.videoKey || lesson.videoUrl,
      });
    }

    await repairOldVideoAssetOwner({
      videoAsset,
      course,
      user: req.user,
    });

    const fallbackToMp4 = ({ reason = "HLS is not ready yet" } = {}) => {
      const videoKey = getLessonVideoKey({
        lesson,
        videoAsset,
      });

      if (!videoKey) {
        return res.status(404).json({
          success: false,
          message: "Lesson video is not available",
          reason,
        });
      }

      const videoUrl = createSignedCloudFrontPlaybackUrl({
        key: videoKey,
      });

      const expiresIn = getCloudFrontExpiresIn();

      return res.status(200).json({
        success: true,
        message: "MP4 fallback video access granted",
        playbackMode: "fallback",
        type: "mp4",
        source: "cloudfront",
        sourceType: "cloudfront",
        fallback: true,
        reason,
        videoUrl,
        signedUrl: videoUrl,
        url: videoUrl,
        key: videoKey,
        hlsStatus: videoAsset?.hlsStatus || "not_started",
        mediaConvertJobStatus: videoAsset?.mediaConvertJobStatus || "",
        accessType: access.accessType,
        expiresIn,
      });
    };

    let hlsManifestKey =
      videoAsset?.hlsManifestKey ||
      lesson.hlsManifestKey ||
      lesson.videoHlsManifestKey ||
      "";

    let hlsOutputPrefix =
      videoAsset?.hlsOutputPrefix || lesson.hlsOutputPrefix || "";

    const isHlsReady =
      Boolean(hlsManifestKey) &&
      hlsManifestKey.endsWith(".m3u8") &&
      (!videoAsset || videoAsset.hlsStatus === "ready");

    if (!isHlsReady) {
      const hlsStatus = videoAsset?.hlsStatus || "not_started";

      if (hlsStatus === "failed") {
        return fallbackToMp4({
          reason: videoAsset?.processingError || "HLS processing failed",
        });
      }

      return fallbackToMp4({
        reason: `HLS ${hlsStatus}. Playing original MP4 until HLS is ready.`,
      });
    }

    if (!hlsOutputPrefix) {
      hlsOutputPrefix = getHlsPrefixFromManifestKey(hlsManifestKey);
    }

    const manifestUrl = buildCloudFrontVideoUrl(hlsManifestKey);
    const hlsAccessMode = getCloudFrontHlsMode();
    const shouldUseSignedCookies = hlsAccessMode !== "local-dev-public-hls";

    let signedCookieData = null;

    if (shouldUseSignedCookies) {
      signedCookieData = createCloudFrontHlsSignedCookies({
        hlsOutputPrefix,
      });

      setCloudFrontCookiesOnResponse({
        res,
        cookies: signedCookieData.cookies,
        maxAgeMs: signedCookieData.maxAgeMs,
      });
    } else {
      console.log("HLS_LOCAL_DEV_PUBLIC_MODE_ACTIVE", {
        hlsManifestKey,
        hlsOutputPrefix,
        manifestUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: shouldUseSignedCookies
        ? "HLS access granted with CloudFront signed cookies"
        : "HLS access granted in local dev public mode",
      playbackMode: "hls",
      type: "hls",
      source: "cloudfront",
      sourceType: "cloudfront-hls",
      fallback: false,

      hlsAccessMode,
      requiresSignedCookies: shouldUseSignedCookies,
      signedCookiesSet: shouldUseSignedCookies,

      manifestUrl,
      videoUrl: manifestUrl,
      url: manifestUrl,

      hlsManifestKey,
      hlsOutputPrefix,
      hlsStatus: videoAsset?.hlsStatus || "ready",
      mediaConvertJobStatus: videoAsset?.mediaConvertJobStatus || "COMPLETE",

      qualities: [
        { label: "Auto", value: "auto" },
        { label: "720p", value: "720p" },
        { label: "480p", value: "480p" },
        { label: "360p", value: "360p" },
      ],

      accessType: access.accessType,
      expiresAt: signedCookieData?.expiresAt || null,
    });
  } catch (error) {
    console.error("GET_HLS_LESSON_ACCESS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create video access",
      error: error.message,
    });
  }
};

export const createAdminVideoUploadUrl = async (req, res) => {
  try {
    const {
      fileName,
      contentType,
      sizeBytes,
      courseSlug = "",
      courseId = "",
      lessonId = "",
    } = req.body;

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

    const adminId = getUserId(req);

    const key = buildUniqueVideoKey({
      adminId,
      courseSlug,
      courseId,
      lessonId,
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
      displayTitle = "",
      duration = "",
      durationSeconds = 0,
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
        adminId: getUserId(req),
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
        courseId: courseId || null,
        lessonId: lessonId || null,
        displayTitle,
        duration,
        durationSeconds: Number(durationSeconds || 0),
      });
    } else {
      video.displayTitle = displayTitle || video.displayTitle || "";
      video.duration = duration || video.duration || "";
      video.durationSeconds = Number(
        durationSeconds || video.durationSeconds || 0,
      );
      video.courseId = courseId || video.courseId || null;
      video.lessonId = lessonId || video.lessonId || null;
      await video.save();
    }

    if (video.hlsStatus === "ready" || video.hlsStatus === "processing") {
      await syncCourseLessonVideoAfterUpload({
        req,
        courseId,
        lessonId,
        video,
        originalName,
        mimeType,
        sizeBytes,
        displayTitle,
        duration,
        durationSeconds,
      });

      return res.status(200).json({
        success: true,
        message: "Video already confirmed",
        video,
      });
    }

    let hlsStarted = false;
    let hlsError = "";

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

    await syncCourseLessonVideoAfterUpload({
      req,
      courseId,
      lessonId,
      video,
      originalName,
      mimeType,
      sizeBytes,
      displayTitle,
      duration,
      durationSeconds,
    });

    return res.status(201).json({
      success: true,
      message: hlsStarted
        ? "Video upload confirmed and HLS processing started"
        : "Video upload confirmed. HLS processing can be retried later.",
      hlsStarted,
      hlsError,
      video,
    });
  } catch (error) {
    console.error("CONFIRM_VIDEO_UPLOAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Video uploaded, but failed to confirm video",
      error: error.message,
    });
  }
};

export const initiateAdminMultipartUpload = async (req, res) => {
  try {
    const {
      fileName,
      contentType,
      sizeBytes,
      courseSlug = "",
      courseId = "",
      lessonId = "",
    } = req.body;

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

    const adminId = getUserId(req);

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

    const key = buildUniqueVideoKey({
      adminId,
      courseSlug,
      courseId,
      lessonId,
      originalName: fileName,
    });

    const multipart = await initiateMultipartUpload({
      key,
      contentType,
    });

    const video = await VideoAsset.create({
      adminId,
      key: multipart.key,
      originalKey: multipart.key,
      uploadId: multipart.uploadId,
      originalName: fileName,
      bucket: getBucketName(),
      region: getRegion(),
      mimeType: contentType,
      sizeBytes: Number(sizeBytes || 0),
      sourceType: "s3",
      status: "uploaded",
      hlsStatus: "not_started",
      courseId: courseId || null,
      lessonId: lessonId || null,
      processingError: "",
    });

    return res.status(200).json({
      success: true,
      uploadId: multipart.uploadId,
      key: multipart.key,
      bucket: multipart.bucket,
      region: multipart.region,
      video,
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

    const video = await findAdminVideoUpload({
      req,
      key,
      uploadId,
    });

    if (!video) {
      return res.status(403).json({
        success: false,
        message:
          "You can upload parts only for your own video. Please clear old uploads and choose video again.",
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
      displayTitle = "",
      duration = "",
      durationSeconds = 0,
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

    let video = await findAdminVideoUpload({
      req,
      key,
      uploadId,
    });

    if (!video) {
      return res.status(403).json({
        success: false,
        message:
          "You can complete upload only for your own video. Please clear old uploads and choose video again.",
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

    video.originalKey = video.originalKey || key;
    video.originalName = originalName;
    video.mimeType = mimeType;
    video.sizeBytes = Number(sizeBytes || 0);
    video.displayTitle = displayTitle || video.displayTitle || "";
    video.duration = duration || video.duration || "";
    video.durationSeconds = Number(
      durationSeconds || video.durationSeconds || 0,
    );
    video.courseId = courseId || video.courseId || null;
    video.lessonId = lessonId || video.lessonId || null;
    video.status = "uploaded";
    video.hlsStatus = video.hlsStatus || "not_started";
    video.processingError = "";

    await video.save();

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

    await syncCourseLessonVideoAfterUpload({
      req,
      courseId,
      lessonId,
      video,
      originalName,
      mimeType,
      sizeBytes,
      displayTitle,
      duration,
      durationSeconds,
    });

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

    const video = await findAdminVideoUpload({
      req,
      key,
      uploadId,
    });

    if (!video) {
      return res.status(403).json({
        success: false,
        message: "You can abort only your own video upload",
      });
    }

    await abortMultipartUpload({
      key,
      uploadId,
    });

    video.status = "failed";
    video.hlsStatus = "failed";
    video.processingError = "Multipart upload aborted by admin";
    await video.save();

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
  return res.status(410).json({
    success: false,
    message:
      "Server video upload is disabled. Use direct S3 presigned multipart upload.",
  });
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
      adminId: getUserId(req),
      status: {
        $in: ["uploaded", "processing", "ready", "failed"],
      },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = await VideoAsset.aggregate([
      {
        $match: {
          adminId: getUserId(req),
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

export const deleteAdminLessonVideo = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "courseId and lessonId are required",
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

    const course = courseAccess.course;
    const lesson = findLessonById(course, lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const oldSnapshot = getLessonVideoSnapshot(lesson);

    clearLessonVideoFields(lesson);

    await course.save();

    await cleanupOldLessonVideoAfterReplace({
      oldSnapshot,
    });

    return res.status(200).json({
      success: true,
      message: "Lesson video removed successfully",
    });
  } catch (error) {
    console.error("DELETE_ADMIN_LESSON_VIDEO_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete lesson video",
      error: error.message,
    });
  }
};
