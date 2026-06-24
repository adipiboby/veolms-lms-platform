import express from "express";
import {
  getSignedLessonVideoUrl,
  uploadAdminVideo,
} from "../controllers/video.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/signed-url",
  protect,
  authorizeRoles("student"),
  getSignedLessonVideoUrl
);

router.post(
  "/upload",
  protect,
  authorizeRoles("admin"),
  uploadVideo.single("video"),
  uploadAdminVideo
);

export default router;