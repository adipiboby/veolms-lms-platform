import express from "express";

import {
  createLessonComment,
  deleteLessonComment,
  deleteLessonCommentReply,
  getLessonComments,
  replyToLessonComment,
  togglePinLessonComment,
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

router.post(
  "/:commentId/replies",
  protect,
  authorizeRoles("student", "admin"),
  replyToLessonComment,
);

router.delete(
  "/:commentId/replies/:replyId",
  protect,
  authorizeRoles("student", "admin"),
  deleteLessonCommentReply,
);

router.patch(
  "/:id/pin",
  protect,
  authorizeRoles("admin"),
  togglePinLessonComment,
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("student", "admin"),
  deleteLessonComment,
);

export default router;