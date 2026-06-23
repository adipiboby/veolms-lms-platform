import express from "express";
import {
  getAllCourses,
  getFeaturedCourses,
  getCourseBySlug,
} from "../controllers/course.controller.js";

const router = express.Router();

router.get("/", getAllCourses);
router.get("/featured", getFeaturedCourses);
router.get("/:slug", getCourseBySlug);

export default router;