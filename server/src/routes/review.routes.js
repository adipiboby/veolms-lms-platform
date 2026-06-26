import express from "express";

import {
  createOrUpdateReview,
  deleteMyReview,
  getCourseReviews,
} from "../controllers/review.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/course/:courseId", getCourseReviews);

router.post(
  "/course/:courseId",
  protect,
  authorizeRoles("student"),
  createOrUpdateReview
);

router.delete(
  "/course/:courseId",
  protect,
  authorizeRoles("student"),
  deleteMyReview
);

export default router;