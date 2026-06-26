import express from "express";
import {
  createLessonComment,
  deleteLessonComment,
  getLessonComments,
  togglePinLessonComment,
  updateLessonComment,
} from "../controllers/lessonComment.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/course/:courseId/lesson/:lessonId",
  protect,
  authorizeRoles("student", "admin"),
  getLessonComments,
);

router.post(
  "/course/:courseId/lesson/:lessonId",
  protect,
  authorizeRoles("student", "admin"),
  createLessonComment,
);

router.patch(
  "/:commentId",
  protect,
  authorizeRoles("student", "admin"),
  updateLessonComment,
);

router.patch(
  "/:commentId/pin",
  protect,
  authorizeRoles("admin"),
  togglePinLessonComment,
);

router.delete(
  "/:commentId",
  protect,
  authorizeRoles("student", "admin"),
  deleteLessonComment,
);

export default router;