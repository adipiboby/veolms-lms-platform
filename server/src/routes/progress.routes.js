import express from "express";
import {
  getCourseProgress,
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

router.post(
  "/lesson",
  protect,
  authorizeRoles("student"),
  updateLessonProgress,
);

export default router;