import express from "express";

import {
  abortAdminMultipartUpload,
  completeAdminMultipartUpload,
  confirmAdminVideoUpload,
  createAdminVideoUploadUrl,
  deleteAdminLessonVideo,
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

const router = express.Router();

router.post(
  "/signed-url",
  protect,
  authorizeRoles("student", "admin"),
  getSignedLessonVideoUrl,
);

router.post(
  "/hls-access",
  protect,
  authorizeRoles("student", "admin"),
  getHlsLessonAccess,
);

router.post(
  "/admin/presign-upload",
  protect,
  authorizeRoles("admin"),
  createAdminVideoUploadUrl,
);

router.post(
  "/admin/confirm-upload",
  protect,
  authorizeRoles("admin"),
  confirmAdminVideoUpload,
);

router.post(
  "/admin/multipart/initiate",
  protect,
  authorizeRoles("admin"),
  initiateAdminMultipartUpload,
);

router.post(
  "/admin/multipart/presign-part",
  protect,
  authorizeRoles("admin"),
  getAdminMultipartPartUrl,
);

router.post(
  "/admin/multipart/complete",
  protect,
  authorizeRoles("admin"),
  completeAdminMultipartUpload,
);

router.post(
  "/admin/multipart/abort",
  protect,
  authorizeRoles("admin"),
  abortAdminMultipartUpload,
);

router.delete(
  "/admin/lesson/:courseId/:lessonId",
  protect,
  authorizeRoles("admin"),
  deleteAdminLessonVideo,
);

router.post(
  "/admin/start-hls/:videoId",
  protect,
  authorizeRoles("admin"),
  startAdminHlsProcessing,
);

router.get(
  "/admin/job-status/:videoId",
  protect,
  authorizeRoles("admin"),
  getAdminMediaConvertJobStatus,
);

router.get(
  "/admin/storage",
  protect,
  authorizeRoles("admin"),
  getAdminStorageOverview,
);

export default router;
