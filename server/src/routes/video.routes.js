import express from "express";

import {
  abortAdminMultipartUpload,
  completeAdminMultipartUpload,
  confirmAdminVideoUpload,
  createAdminVideoUploadUrl,
  getAdminMediaConvertJobStatus,
  getAdminMultipartPartUrl,
  getAdminStorageOverview,
  getHlsLessonAccess,
  getSignedLessonVideoUrl,
  initiateAdminMultipartUpload,
  startAdminHlsProcessing,
  uploadAdminVideo,
} from "../controllers/video.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/signed-url",
  protect,
  authorizeRoles("student", "admin", "superAdmin"),
  getSignedLessonVideoUrl
);

router.post(
  "/hls-access",
  protect,
  authorizeRoles("student", "admin", "superAdmin"),
  getHlsLessonAccess
);

router.post(
  "/admin/presign-upload",
  protect,
  authorizeRoles("admin", "superAdmin"),
  createAdminVideoUploadUrl
);

router.post(
  "/admin/confirm-upload",
  protect,
  authorizeRoles("admin", "superAdmin"),
  confirmAdminVideoUpload
);

router.post(
  "/admin/multipart/initiate",
  protect,
  authorizeRoles("admin", "superAdmin"),
  initiateAdminMultipartUpload
);

router.post(
  "/admin/multipart/presign-part",
  protect,
  authorizeRoles("admin", "superAdmin"),
  getAdminMultipartPartUrl
);

router.post(
  "/admin/multipart/complete",
  protect,
  authorizeRoles("admin", "superAdmin"),
  completeAdminMultipartUpload
);

router.post(
  "/admin/multipart/abort",
  protect,
  authorizeRoles("admin", "superAdmin"),
  abortAdminMultipartUpload
);

router.post(
  "/admin/start-hls/:videoId",
  protect,
  authorizeRoles("admin", "superAdmin"),
  startAdminHlsProcessing
);

router.get(
  "/admin/job-status/:videoId",
  protect,
  authorizeRoles("admin", "superAdmin"),
  getAdminMediaConvertJobStatus
);

router.post(
  "/upload",
  protect,
  authorizeRoles("admin", "superAdmin"),
  uploadVideo.single("video"),
  uploadAdminVideo
);

router.get(
  "/admin/storage",
  protect,
  authorizeRoles("admin", "superAdmin"),
  getAdminStorageOverview
);

export default router;