import express from "express";

import {
  deleteMyLessonNote,
  getMyCourseNotes,
  getMyLessonNote,
  saveMyLessonNote,
} from "../controllers/note.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/course/:courseId",
  protect,
  authorizeRoles("student"),
  getMyCourseNotes
);

router.get(
  "/course/:courseId/lesson/:lessonId",
  protect,
  authorizeRoles("student"),
  getMyLessonNote
);

router.post(
  "/course/:courseId/lesson/:lessonId",
  protect,
  authorizeRoles("student"),
  saveMyLessonNote
);

router.delete(
  "/course/:courseId/lesson/:lessonId",
  protect,
  authorizeRoles("student"),
  deleteMyLessonNote
);

export default router;