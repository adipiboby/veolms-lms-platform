import express from "express";
import {
  getMyCourses,
  getLearningCourseBySlug,
  getEnrollmentStatus,
} from "../controllers/enrollment.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student Dashboard - My Courses
|--------------------------------------------------------------------------
| Frontend calls:
| GET /api/enrollments/my
*/
router.get("/my", protect, authorizeRoles("student"), getMyCourses);

/*
|--------------------------------------------------------------------------
| Backup route
|--------------------------------------------------------------------------
| Old frontend route:
| GET /api/enrollments/my-courses
*/
router.get("/my-courses", protect, authorizeRoles("student"), getMyCourses);

/*
|--------------------------------------------------------------------------
| Enrollment Status
|--------------------------------------------------------------------------
| Frontend calls:
| GET /api/enrollments/status/:courseId
*/
router.get(
  "/status/:courseId",
  protect,
  authorizeRoles("student"),
  getEnrollmentStatus,
);

/*
|--------------------------------------------------------------------------
| Learning Page
|--------------------------------------------------------------------------
| Frontend calls:
| GET /api/enrollments/learn/:slug
*/
router.get(
  "/learn/:slug",
  protect,
  authorizeRoles("student"),
  getLearningCourseBySlug,
);

export default router;
