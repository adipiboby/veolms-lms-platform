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
|
| Only student needs this.
| Admin should NOT call this API from frontend.
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
|
| Student:
| Can access only if enrolled.
|
| Admin:
| Can access only if he created that course.
*/
router.get(
  "/learn/:slug",
  protect,
  authorizeRoles("student", "admin"),
  getLearningCourseBySlug,
);

export default router;
