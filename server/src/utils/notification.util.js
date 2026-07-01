import Notification from "../models/notification.model.js";
import { User } from "../models/user.model.js";

export const createNotification = async ({
  recipientId,
  createdBy = null,
  type = "system",
  title,
  message,
  priority = "normal",
  link = "",
  metadata = {},
}) => {
  if (!recipientId || !title || !message) return null;

  return Notification.create({
    recipientId,
    createdBy,
    type,
    title,
    message,
    priority,
    link,
    metadata,
  });
};

export const createNotificationsForUsers = async ({
  userIds = [],
  createdBy = null,
  type = "system",
  title,
  message,
  priority = "normal",
  link = "",
  metadata = {},
}) => {
  const cleanUserIds = [...new Set(userIds.map(String))].filter(Boolean);

  if (cleanUserIds.length === 0 || !title || !message) return [];

  const notifications = cleanUserIds.map((recipientId) => ({
    recipientId,
    createdBy,
    type,
    title,
    message,
    priority,
    link,
    metadata,
  }));

  return Notification.insertMany(notifications);
};

export const notifyAllStudents = async ({
  createdBy = null,
  type = "system",
  title,
  message,
  priority = "normal",
  link = "",
  metadata = {},
}) => {
  if (!title || !message) return [];

  const students = await User.find({ role: "student" }).select("_id").lean();

  const studentIds = students.map((student) => student._id);

  return createNotificationsForUsers({
    userIds: studentIds,
    createdBy,
    type,
    title,
    message,
    priority,
    link,
    metadata,
  });
};
