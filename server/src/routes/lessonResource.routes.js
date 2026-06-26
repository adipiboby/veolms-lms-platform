import express from "express";

import {
  createLessonResourceUploadUrl,
  deleteLessonResource,
  getLessonResourceDownloadUrl,
  saveLessonResource,
} from "../controllers/lessonResource.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/upload-url",
  protect,
  authorizeRoles("admin"),
  createLessonResourceUploadUrl,
);

router.post(
  "/save",
  protect,
  authorizeRoles("admin"),
  saveLessonResource,
);

router.get(
  "/download-url/:courseId/:lessonId/:resourceId",
  protect,
  authorizeRoles("student", "admin"),
  getLessonResourceDownloadUrl,
);

router.delete(
  "/:courseId/:lessonId/:resourceId",
  protect,
  authorizeRoles("admin"),
  deleteLessonResource,
);

export default router;