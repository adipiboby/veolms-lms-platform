import express from "express";

import {
  deleteNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);

router.get("/unread-count", getUnreadNotificationCount);

router.patch("/mark-all-read", markAllNotificationsAsRead);

router.patch("/:notificationId/read", markNotificationAsRead);

router.delete("/:notificationId", deleteNotification);

export default router;
