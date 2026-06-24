import express from "express";
import { getSignedLessonVideoUrl } from "../controllers/video.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/signed-url",
  protect,
  authorizeRoles("student"),
  getSignedLessonVideoUrl
);

export default router;