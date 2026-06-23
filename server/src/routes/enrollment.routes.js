import express from "express";
import {
  getMyCourses,
  getLearningCourseBySlug,
} from "../controllers/enrollment.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/my-courses",
  protect,
  authorizeRoles("student"),
  getMyCourses
);

router.get(
  "/learn/:slug",
  protect,
  authorizeRoles("student"),
  getLearningCourseBySlug
);

export default router;