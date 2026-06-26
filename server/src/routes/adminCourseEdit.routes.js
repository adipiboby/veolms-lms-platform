import express from "express";

import {
  getAdminCourseById,
  updateAdminCourseById,
} from "../controllers/adminCourseEdit.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/:courseId",
  protect,
  authorizeRoles("admin"),
  getAdminCourseById,
);

router.put(
  "/:courseId",
  protect,
  authorizeRoles("admin"),
  updateAdminCourseById,
);

router.patch(
  "/:courseId",
  protect,
  authorizeRoles("admin"),
  updateAdminCourseById,
);

export default router;