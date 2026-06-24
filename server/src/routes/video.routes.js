import express from "express";
import {
  getSignedLessonVideoUrl,
  uploadAdminVideo,
  getAdminStorageOverview,
} from "../controllers/video.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/signed-url",
  protect,
  authorizeRoles("student"),
  getSignedLessonVideoUrl,
);

router.post(
  "/upload",
  protect,
  authorizeRoles("admin"),
  uploadVideo.single("video"),
  uploadAdminVideo,
);

router.get(
  "/admin/storage",
  protect,
  authorizeRoles("admin"),
  getAdminStorageOverview,
);
export default router;
