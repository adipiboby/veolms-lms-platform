import express from "express";

import {
  getCourseProgress,
  getLessonWatchPosition,
  saveLessonWatchPosition,
  updateLessonProgress,
} from "../controllers/progress.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/course/:courseId",
  protect,
  authorizeRoles("student"),
  getCourseProgress,
);

router.get(
  "/watch-position/:courseId/:lessonId",
  protect,
  authorizeRoles("student"),
  getLessonWatchPosition,
);

router.post(
  "/watch-position",
  protect,
  authorizeRoles("student"),
  saveLessonWatchPosition,
);

router.post(
  "/lesson",
  protect,
  authorizeRoles("student"),
  updateLessonProgress,
);

export default router;
