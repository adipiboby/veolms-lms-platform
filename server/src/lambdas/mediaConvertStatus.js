import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { Course } from "../models/course.model.js";
import { VideoAsset } from "../models/videoAsset.model.js";

const normalizeKey = (value = "") => {
  return String(value || "").replace(/^\/+/, "");
};

const ensureTrailingSlash = (value = "") => {
  const clean = normalizeKey(value);

  if (!clean) return "";

  return clean.endsWith("/") ? clean : `${clean}/`;
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
};

const toObjectId = (value) => {
  if (!isValidObjectId(value)) return null;

  return new mongoose.Types.ObjectId(String(value));
};

const safeJsonParse = (value) => {
  if (!value) return {};

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getProcessingError = (detail = {}) => {
  return (
    detail.errorMessage ||
    detail.errorCode ||
    detail.jobResult ||
    detail.status ||
    "MediaConvert job failed"
  );
};

const getEventDetails = (event = {}) => {
  const detail = event.detail || {};

  const userMetadata = safeJsonParse(
    detail.userMetadata ||
      detail.UserMetadata ||
      detail.userMetadataJson ||
      detail.UserMetadataJson ||
      {},
  );

  const status = String(detail.status || "").toUpperCase();

  const jobId =
    detail.jobId ||
    detail.JobId ||
    detail.jobID ||
    detail.id ||
    detail.Id ||
    "";

  const videoAssetId =
    userMetadata.videoAssetId ||
    userMetadata.videoId ||
    userMetadata.assetId ||
    "";

  const courseId = userMetadata.courseId || "";
  const lessonId = userMetadata.lessonId || "";

  const hlsManifestKey = normalizeKey(userMetadata.hlsManifestKey || "");
  const hlsOutputPrefix = ensureTrailingSlash(
    userMetadata.hlsOutputPrefix || "",
  );

  return {
    detail,
    userMetadata,
    status,
    jobId: String(jobId || ""),
    videoAssetId: String(videoAssetId || ""),
    courseId: String(courseId || ""),
    lessonId: String(lessonId || ""),
    hlsManifestKey,
    hlsOutputPrefix,
  };
};

const findVideoAsset = async ({
  videoAssetId,
  jobId,
  hlsManifestKey,
  hlsOutputPrefix,
}) => {
  const orConditions = [];

  if (isValidObjectId(videoAssetId)) {
    orConditions.push({ _id: toObjectId(videoAssetId) });
  }

  if (jobId) {
    orConditions.push({ mediaConvertJobId: jobId });
  }

  if (hlsManifestKey) {
    orConditions.push({ hlsManifestKey });
  }

  if (hlsOutputPrefix) {
    orConditions.push({ hlsOutputPrefix });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return VideoAsset.findOne({
    $or: orConditions,
  });
};

const buildFinalManifestKey = ({ hlsManifestKey, hlsOutputPrefix, video }) => {
  const manifestFromEvent = normalizeKey(hlsManifestKey);
  const manifestFromVideo = normalizeKey(video?.hlsManifestKey || "");

  if (manifestFromEvent.endsWith(".m3u8")) return manifestFromEvent;
  if (manifestFromVideo.endsWith(".m3u8")) return manifestFromVideo;

  const prefix = ensureTrailingSlash(
    hlsOutputPrefix || video?.hlsOutputPrefix || "",
  );

  if (!prefix) return "";

  return `${prefix}master.m3u8`;
};

const updateCourseLessonForReadyVideo = async ({
  video,
  courseId,
  lessonId,
}) => {
  const finalCourseId = video?.courseId || courseId;
  const finalLessonId = video?.lessonId || lessonId;

  const courseObjectId = toObjectId(finalCourseId);
  const lessonObjectId = toObjectId(finalLessonId);

  if (!courseObjectId || !lessonObjectId) {
    console.log("COURSE_LESSON_READY_UPDATE_SKIPPED_MISSING_IDS", {
      videoAssetId: String(video?._id || ""),
      courseId: String(finalCourseId || ""),
      lessonId: String(finalLessonId || ""),
    });

    return {
      matchedCount: 0,
      modifiedCount: 0,
    };
  }

  const courseUpdate = await Course.updateOne(
    {
      _id: courseObjectId,
      "sections.lessons._id": lessonObjectId,
    },
    {
      $set: {
        "sections.$[].lessons.$[lesson].videoUrl": video.key,
        "sections.$[].lessons.$[lesson].videoKey": video.key,
        "sections.$[].lessons.$[lesson].videoAssetId": video._id,

        "sections.$[].lessons.$[lesson].hlsManifestKey":
          video.hlsManifestKey || "",
        "sections.$[].lessons.$[lesson].hlsOutputPrefix":
          video.hlsOutputPrefix || "",

        "sections.$[].lessons.$[lesson].duration": video.duration || "",
        "sections.$[].lessons.$[lesson].durationSeconds":
          video.durationSeconds || 0,
        "sections.$[].lessons.$[lesson].originalVideoName":
          video.originalName || "",
        "sections.$[].lessons.$[lesson].sizeBytes": video.sizeBytes || 0,
        "sections.$[].lessons.$[lesson].mimeType": video.mimeType || "",
      },
    },
    {
      arrayFilters: [{ "lesson._id": lessonObjectId }],
    },
  );

  console.log("COURSE_LESSON_READY_UPDATE_RESULT", {
    videoAssetId: String(video._id),
    courseId: String(courseObjectId),
    lessonId: String(lessonObjectId),
    matchedCount: courseUpdate.matchedCount,
    modifiedCount: courseUpdate.modifiedCount,
  });

  return courseUpdate;
};

const updateCourseLessonForFallbackVideo = async ({ video }) => {
  const courseObjectId = toObjectId(video?.courseId);
  const lessonObjectId = toObjectId(video?.lessonId);

  if (!courseObjectId || !lessonObjectId) {
    console.log("COURSE_LESSON_FALLBACK_UPDATE_SKIPPED_MISSING_IDS", {
      videoAssetId: String(video?._id || ""),
      courseId: String(video?.courseId || ""),
      lessonId: String(video?.lessonId || ""),
    });

    return {
      matchedCount: 0,
      modifiedCount: 0,
    };
  }

  const courseUpdate = await Course.updateOne(
    {
      _id: courseObjectId,
      "sections.lessons._id": lessonObjectId,
    },
    {
      $set: {
        "sections.$[].lessons.$[lesson].videoUrl": video.key,
        "sections.$[].lessons.$[lesson].videoKey": video.key,
        "sections.$[].lessons.$[lesson].videoAssetId": video._id,

        "sections.$[].lessons.$[lesson].duration": video.duration || "",
        "sections.$[].lessons.$[lesson].durationSeconds":
          video.durationSeconds || 0,
        "sections.$[].lessons.$[lesson].originalVideoName":
          video.originalName || "",
        "sections.$[].lessons.$[lesson].sizeBytes": video.sizeBytes || 0,
        "sections.$[].lessons.$[lesson].mimeType": video.mimeType || "",
      },
    },
    {
      arrayFilters: [{ "lesson._id": lessonObjectId }],
    },
  );

  console.log("COURSE_LESSON_FALLBACK_UPDATE_RESULT", {
    videoAssetId: String(video._id),
    courseId: String(courseObjectId),
    lessonId: String(lessonObjectId),
    matchedCount: courseUpdate.matchedCount,
    modifiedCount: courseUpdate.modifiedCount,
  });

  return courseUpdate;
};

const handleCompleteJob = async ({
  video,
  jobId,
  status,
  courseId,
  lessonId,
  hlsManifestKey,
  hlsOutputPrefix,
}) => {
  const finalOutputPrefix = ensureTrailingSlash(
    hlsOutputPrefix || video.hlsOutputPrefix || "",
  );

  const finalManifestKey = buildFinalManifestKey({
    hlsManifestKey,
    hlsOutputPrefix: finalOutputPrefix,
    video,
  });

  if (courseId && !video.courseId) {
    video.courseId = courseId;
  }

  if (lessonId && !video.lessonId) {
    video.lessonId = lessonId;
  }

  video.status = "ready";
  video.hlsStatus = "ready";
  video.mediaConvertJobStatus = status || "COMPLETE";
  video.mediaConvertJobId = jobId || video.mediaConvertJobId || "";
  video.hlsManifestKey = finalManifestKey;
  video.hlsOutputPrefix = finalOutputPrefix;
  video.processingError = "";
  video.processedAt = new Date();

  await video.save();

  const courseUpdate = await updateCourseLessonForReadyVideo({
    video,
    courseId,
    lessonId,
  });

  console.log("MEDIACONVERT_COMPLETE_UPDATED", {
    videoAssetId: String(video._id),
    jobId,
    status,
    hlsStatus: video.hlsStatus,
    hlsManifestKey: video.hlsManifestKey,
    hlsOutputPrefix: video.hlsOutputPrefix,
    courseMatchedCount: courseUpdate.matchedCount,
    courseModifiedCount: courseUpdate.modifiedCount,
  });

  return {
    ok: true,
    status: "ready",
    videoAssetId: String(video._id),
    jobId,
    hlsManifestKey: video.hlsManifestKey,
    hlsOutputPrefix: video.hlsOutputPrefix,
    courseMatchedCount: courseUpdate.matchedCount,
    courseModifiedCount: courseUpdate.modifiedCount,
  };
};

const handleFailedJob = async ({ video, jobId, status, processingError }) => {
  if (video.hlsStatus === "ready") {
    console.log("MEDIACONVERT_FAILED_EVENT_IGNORED_ALREADY_READY", {
      videoAssetId: String(video._id),
      jobId,
      status,
    });

    return {
      ok: true,
      ignored: true,
      reason: "already_ready",
      videoAssetId: String(video._id),
      jobId,
      status,
    };
  }

  video.status = "uploaded";
  video.hlsStatus = "failed";
  video.mediaConvertJobStatus = status || "ERROR";
  video.mediaConvertJobId = jobId || video.mediaConvertJobId || "";
  video.processingError = processingError || "MediaConvert job failed";
  video.processedAt = new Date();

  await video.save();

  const courseUpdate = await updateCourseLessonForFallbackVideo({ video });

  console.log("MEDIACONVERT_FAILED_UPDATED_MP4_FALLBACK", {
    videoAssetId: String(video._id),
    jobId,
    status,
    processingError,
    courseMatchedCount: courseUpdate.matchedCount,
    courseModifiedCount: courseUpdate.modifiedCount,
  });

  return {
    ok: true,
    status: "fallback_mp4",
    videoAssetId: String(video._id),
    jobId,
    processingError,
    courseMatchedCount: courseUpdate.matchedCount,
    courseModifiedCount: courseUpdate.modifiedCount,
  };
};

const handleProgressingJob = async ({ video, jobId, status }) => {
  if (video.hlsStatus === "ready" || video.status === "ready") {
    console.log("MEDIACONVERT_PROGRESSING_IGNORED_ALREADY_READY", {
      videoAssetId: String(video._id),
      jobId,
      status,
    });

    return {
      ok: true,
      ignored: true,
      reason: "already_ready",
      videoAssetId: String(video._id),
      jobId,
      status,
    };
  }

  video.status = "processing";
  video.hlsStatus = "processing";
  video.mediaConvertJobStatus = status || "PROGRESSING";
  video.mediaConvertJobId = jobId || video.mediaConvertJobId || "";

  await video.save();

  console.log("MEDIACONVERT_PROGRESSING_UPDATED", {
    videoAssetId: String(video._id),
    jobId,
    status,
  });

  return {
    ok: true,
    status: "processing",
    videoAssetId: String(video._id),
    jobId,
  };
};

export const handler = async (event = {}) => {
  console.log("MEDIACONVERT_EVENT_RECEIVED", JSON.stringify(event, null, 2));

  try {
    const {
      detail,
      userMetadata,
      status,
      jobId,
      videoAssetId,
      courseId,
      lessonId,
      hlsManifestKey,
      hlsOutputPrefix,
    } = getEventDetails(event);

    console.log("MEDIACONVERT_EVENT_PARSED", {
      status,
      jobId,
      videoAssetId,
      courseId,
      lessonId,
      hlsManifestKey,
      hlsOutputPrefix,
      userMetadata,
    });

    if (!status) {
      console.log("MEDIACONVERT_EVENT_IGNORED_NO_STATUS", {
        detail,
      });

      return {
        ok: true,
        ignored: true,
        reason: "NO_STATUS",
      };
    }

    await connectDB();

    const video = await findVideoAsset({
      videoAssetId,
      jobId,
      hlsManifestKey,
      hlsOutputPrefix,
    });

    if (!video) {
      console.error("MEDIACONVERT_VIDEO_ASSET_NOT_FOUND", {
        videoAssetId,
        jobId,
        courseId,
        lessonId,
        hlsManifestKey,
        hlsOutputPrefix,
        status,
      });

      return {
        ok: false,
        reason: "VIDEO_ASSET_NOT_FOUND",
        videoAssetId,
        jobId,
        courseId,
        lessonId,
        hlsManifestKey,
        hlsOutputPrefix,
        status,
      };
    }

    if (status === "COMPLETE") {
      return await handleCompleteJob({
        video,
        jobId,
        status,
        courseId,
        lessonId,
        hlsManifestKey,
        hlsOutputPrefix,
      });
    }

    if (status === "ERROR" || status === "CANCELED") {
      return await handleFailedJob({
        video,
        jobId,
        status,
        processingError: getProcessingError(detail),
      });
    }

    if (status === "PROGRESSING") {
      return await handleProgressingJob({
        video,
        jobId,
        status,
      });
    }

    console.log("MEDIACONVERT_STATUS_IGNORED", {
      videoAssetId: String(video._id),
      jobId,
      status,
    });

    return {
      ok: true,
      ignored: true,
      status,
      videoAssetId: String(video._id),
      jobId,
    };
  } catch (error) {
    console.error("MEDIACONVERT_EVENT_HANDLER_ERROR", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};
