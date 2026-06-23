import express from "express";
import {
  getAllCourses,
  getAdminCourses,
  getAdminCourseById,
  getFeaturedCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/course.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../validators/course.validator.js";

const router = express.Router();

router.get("/", getAllCourses);
router.get("/featured", getFeaturedCourses);

router.get(
  "/admin/all",
  protect,
  authorizeRoles("admin"),
  getAdminCourses
);
router.get(
  "/admin/:id",
  protect,
  authorizeRoles("admin"),
  getAdminCourseById
);
router.post(
  "/admin",
  protect,
  authorizeRoles("admin"),
  validate(createCourseSchema),
  createCourse
);

router.put(
  "/admin/:id",
  protect,
  authorizeRoles("admin"),
  validate(updateCourseSchema),
  updateCourse
);

router.delete(
  "/admin/:id",
  protect,
  authorizeRoles("admin"),
  deleteCourse
);

router.get("/:slug", getCourseBySlug);

export default router;