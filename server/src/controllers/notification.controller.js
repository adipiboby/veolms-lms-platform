import Notification from "../models/notification.model.js";

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

export const getMyNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page = 1, limit = 20, unreadOnly = "false" } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      recipientId: userId,
    };

    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const [notifications, totalNotifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ isRead: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        recipientId: userId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalNotifications,
        totalPages: Math.ceil(totalNotifications / safeLimit),
      },
    });
  } catch (error) {
    console.error("GET_MY_NOTIFICATIONS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load notifications.",
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = getUserId(req);

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("GET_UNREAD_NOTIFICATION_COUNT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load unread notification count.",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("MARK_NOTIFICATION_AS_READ_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);

    await Notification.updateMany(
      {
        recipientId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("MARK_ALL_NOTIFICATIONS_AS_READ_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_NOTIFICATION_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete notification.",
    });
  }
};
