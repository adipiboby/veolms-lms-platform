import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
  Trash2,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const formatDateTime = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const PriorityBadge = ({ priority }) => {
  if (priority === "urgent") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
        Urgent
      </span>
    );
  }

  if (priority === "important") {
    return (
      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
        Important
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      Normal
    </span>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/notifications");

      setNotifications(
        Array.isArray(data?.notifications) ? data.notifications : [],
      );

      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (error) {
      console.error("NOTIFICATIONS_FETCH_ERROR:", error);

      setError(
        error?.response?.data?.message || "Unable to load notifications.",
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [isAuthenticated]);

  const refreshNavbarNotificationCount = () => {
    window.dispatchEvent(new Event("notifications-updated"));
  };

  const replaceNotification = (updatedNotification) => {
    if (!updatedNotification?._id) return;

    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) =>
        notification?._id === updatedNotification._id
          ? updatedNotification
          : notification,
      ),
    );
  };

  const markOneAsRead = async (notification) => {
    if (!notification?._id || notification?.isRead) return notification;

    const { data } = await api.patch(
      `/notifications/${notification._id}/read`,
      {},
    );

    if (data?.notification) {
      replaceNotification(data.notification);
    }

    setUnreadCount((previousCount) => Math.max(0, previousCount - 1));
    refreshNavbarNotificationCount();

    return data?.notification || notification;
  };

  const handleNotificationClick = async (notification) => {
    try {
      setActionLoadingId(`open-${notification?._id}`);
      setError("");
      setSuccessMessage("");

      await markOneAsRead(notification);

      const link = notification?.link || "";

      if (link) {
        navigate(link);
      }
    } catch (error) {
      console.error("NOTIFICATION_OPEN_ERROR:", error);

      setError(
        error?.response?.data?.message || "Unable to open notification.",
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoadingId("mark-all");
      setError("");
      setSuccessMessage("");

      await api.patch("/notifications/mark-all-read", {});

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
      refreshNavbarNotificationCount();
      setSuccessMessage("All notifications marked as read.");
    } catch (error) {
      console.error("MARK_ALL_NOTIFICATIONS_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          "Unable to mark notifications as read.",
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteNotification = async (event, notification) => {
    event.stopPropagation();

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this notification?",
    );

    if (!confirmDelete) return;

    try {
      setActionLoadingId(`delete-${notification?._id}`);
      setError("");
      setSuccessMessage("");

      await api.delete(`/notifications/${notification?._id}`);

      setNotifications((previousNotifications) =>
        previousNotifications.filter((item) => item?._id !== notification?._id),
      );

      if (!notification?.isRead) {
        setUnreadCount((previousCount) => Math.max(0, previousCount - 1));
        refreshNavbarNotificationCount();
      }

      setSuccessMessage("Notification deleted successfully.");
    } catch (error) {
      console.error("DELETE_NOTIFICATION_ERROR:", error);

      setError(
        error?.response?.data?.message || "Unable to delete notification.",
      );
    } finally {
      setActionLoadingId("");
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <Bell
            size={44}
            className="mx-auto text-blue-600 dark:text-blue-300"
          />

          <h1 className="mt-4 text-3xl font-black">Notifications</h1>

          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Please login to view your notifications.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
              <Bell size={16} />
              Notification Center
            </p>

            <h1 className="text-4xl font-black">Notifications</h1>

            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              Track important announcements, course updates, enrollment events,
              payment alerts, and system messages.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!hasUnread || actionLoadingId === "mark-all"}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoadingId === "mark-all" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCheck size={18} />
            )}
            Mark all read
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Inbox</h2>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }`
                  : "You are all caught up."}
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-black text-white">
                {unreadCount > 99 ? "99+" : unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <Loader2
              size={40}
              className="animate-spin text-blue-500 dark:text-blue-400"
            />

            <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <Inbox
              size={44}
              className="mx-auto text-blue-600 dark:text-blue-300"
            />

            <h2 className="mt-4 text-2xl font-black">No notifications</h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Important updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isUnread = !notification?.isRead;
              const isOpening = actionLoadingId === `open-${notification?._id}`;
              const isDeleting =
                actionLoadingId === `delete-${notification?._id}`;

              return (
                <button
                  key={notification?._id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full rounded-3xl border p-5 text-left shadow-xl transition hover:-translate-y-0.5 ${
                    isUnread
                      ? "border-blue-200 bg-blue-50 shadow-blue-100/70 dark:border-blue-400/20 dark:bg-blue-500/10 dark:shadow-black/20"
                      : "border-slate-200 bg-white shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isUnread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        )}

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black capitalize text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                          {notification?.type || "system"}
                        </span>

                        <PriorityBadge
                          priority={notification?.priority || "normal"}
                        />

                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {formatDateTime(notification?.createdAt)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                        {notification?.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {notification?.message}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {notification?.link && (
                        <span className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {isOpening ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ExternalLink size={16} />
                          )}
                        </span>
                      )}

                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) =>
                          handleDeleteNotification(event, notification)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            handleDeleteNotification(event, notification);
                          }
                        }}
                        className="rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      >
                        {isDeleting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default NotificationsPage;
