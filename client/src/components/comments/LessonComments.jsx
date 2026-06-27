import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  Pin,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

const getUserFromItem = (item) => {
  return item?.userId || item?.user || null;
};

const getObjectId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  return value?._id || value?.id || "";
};

const getUserIdFromItem = (item) => {
  return getObjectId(getUserFromItem(item));
};

const getUserName = (item) => {
  const user = getUserFromItem(item);

  return user?.name || user?.email?.split("@")[0] || "User";
};

const getAvatar = (item) => {
  const user = getUserFromItem(item);

  return (
    user?.avatar || user?.photo || user?.profilePhoto || user?.picture || ""
  );
};

const getUserRole = (item) => {
  return item?.role || getUserFromItem(item)?.role || "";
};

const isAdminRole = (role) => role === "admin";

const getInitial = (name = "") => {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

const isSameUser = (a, b) => {
  if (!a || !b) return false;

  return String(a) === String(b);
};

const UserAvatar = ({ item, size = "md" }) => {
  const name = getUserName(item);
  const avatar = getAvatar(item);
  const role = getUserRole(item);

  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10`}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-black ${
            isAdminRole(role)
              ? "bg-blue-500 text-white"
              : "bg-slate-700 text-slate-100"
          }`}
        >
          {getInitial(name)}
        </div>
      )}
    </div>
  );
};

const RoleBadge = ({ role, small = false }) => {
  if (!isAdminRole(role)) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/15 font-black text-blue-200 ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <ShieldCheck size={small ? 11 : 13} />
      Admin
    </span>
  );
};

const ReplyCard = ({
  comment,
  replyItem,
  currentUser,
  onReply,
  onDeleteReply,
  deletingReplyId,
  replyingReplyId,
}) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");

  const authorName = getUserName(replyItem);
  const role = getUserRole(replyItem);

  const replyOwnerId = getUserIdFromItem(replyItem);
  const currentUserId = currentUser?._id || currentUser?.id;

  const canDelete =
    currentUser?.role === "admin" || isSameUser(replyOwnerId, currentUserId);

  const currentDeletingId = `${comment?._id}:${replyItem?._id}`;
  const currentReplyingId = `${comment?._id}:${replyItem?._id}`;

  const handleSubmitReplyToReply = async (event) => {
    event.preventDefault();

    const cleanMessage = replyMessage.trim();

    if (!cleanMessage) return;

    const replyTarget = {
      replyToReplyId: replyItem?._id,
      replyToUserId: getUserIdFromItem(replyItem),
      replyToName: getUserName(replyItem),
    };

    const isSuccess = await onReply(comment, cleanMessage, replyTarget);

    if (!isSuccess) return;

    setReplyMessage("");
    setReplyOpen(false);
  };

  return (
    <article className="flex gap-3">
      <UserAvatar item={replyItem} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-black text-white">{authorName}</h4>

          <RoleBadge role={role} small />

          {replyItem?.isEdited && (
            <span className="text-[11px] font-semibold text-slate-500">
              Edited
            </span>
          )}

          <span className="text-[11px] text-slate-500">
            {formatDateTime(replyItem?.createdAt)}
          </span>
        </div>

        <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
          {replyItem?.replyToName && (
            <span className="mr-1 font-black text-blue-300">
              @{replyItem.replyToName}
            </span>
          )}
          {replyItem?.message}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReplyOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white"
          >
            {replyOpen ? <X size={13} /> : <Reply size={13} />}
            {replyOpen ? "Cancel" : "Reply"}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDeleteReply(comment, replyItem)}
              disabled={deletingReplyId === currentDeletingId}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-60"
            >
              {deletingReplyId === currentDeletingId ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Delete
            </button>
          )}
        </div>

        {replyOpen && (
          <form onSubmit={handleSubmitReplyToReply} className="mt-3">
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3">
              <div className="mb-2 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                <p className="text-xs font-bold text-blue-200">
                  Replying to @{authorName}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyMessage("");
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                rows={2}
                maxLength={1000}
                autoFocus
                placeholder={`Write your reply to ${authorName}...`}
                className="w-full resize-none bg-transparent p-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
              />

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className="text-xs text-slate-500">
                  {replyMessage.length}/1000
                </p>

                <button
                  type="submit"
                  disabled={
                    replyingReplyId === currentReplyingId ||
                    !replyMessage.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {replyingReplyId === currentReplyingId ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Replying...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Reply here
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </article>
  );
};

const CommentCard = ({
  comment,
  currentUser,
  onDelete,
  onDeleteReply,
  onPin,
  onReply,
  deletingId,
  deletingReplyId,
  pinningId,
  replyingId,
  replyingReplyId,
}) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");

  const authorName = getUserName(comment);
  const role = getUserRole(comment);
  const isAdminComment = isAdminRole(role);
  const replies = Array.isArray(comment?.replies) ? comment.replies : [];

  const userObj = getUserFromItem(comment);

  const isOwner =
    isSameUser(userObj?._id, currentUser?._id) ||
    isSameUser(userObj?._id, currentUser?.id);

  const canDelete = isOwner || currentUser?.role === "admin";
  const canPin = currentUser?.role === "admin";

  const handleSubmitMainReply = async (event) => {
    event.preventDefault();

    const cleanMessage = replyMessage.trim();

    if (!cleanMessage) return;

    const isSuccess = await onReply(comment, cleanMessage, null);

    if (!isSuccess) return;

    setReplyMessage("");
    setReplyOpen(false);
    setRepliesOpen(true);
  };

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isAdminComment
          ? "border-blue-400/30 bg-blue-500/10"
          : "border-white/10 bg-slate-950/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <UserAvatar item={comment} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-black text-white">{authorName}</h4>

            <RoleBadge role={role} />

            {comment?.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-black text-yellow-200">
                <Pin size={12} />
                Pinned
              </span>
            )}

            {comment?.isEdited && (
              <span className="text-xs font-semibold text-slate-500">
                Edited
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(comment?.createdAt)}
          </p>

          <p className="mt-3 whitespace-pre-line break-words leading-7 text-slate-300">
            {comment?.message}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReplyOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {replyOpen ? <X size={15} /> : <Reply size={15} />}
              {replyOpen ? "Cancel" : "Reply"}
            </button>

            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => setRepliesOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
              >
                {repliesOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                {repliesOpen
                  ? "Hide replies"
                  : `View ${replies.length} ${
                      replies.length === 1 ? "reply" : "replies"
                    }`}
              </button>
            )}
          </div>

          {replyOpen && (
            <form onSubmit={handleSubmitMainReply} className="mt-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  autoFocus
                  placeholder={
                    currentUser?.role === "admin"
                      ? "Write admin reply..."
                      : "Write your reply..."
                  }
                  className="w-full resize-none bg-transparent p-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
                />

                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-500">
                    {replyMessage.length}/1000
                  </p>

                  <button
                    type="submit"
                    disabled={
                      replyingId === comment?._id || !replyMessage.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyingId === comment?._id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Replying...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {repliesOpen && replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l border-white/10 pl-4">
              {replies.map((replyItem) => (
                <ReplyCard
                  key={replyItem?._id}
                  comment={comment}
                  replyItem={replyItem}
                  currentUser={currentUser}
                  deletingReplyId={deletingReplyId}
                  replyingReplyId={replyingReplyId}
                  onDeleteReply={onDeleteReply}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>

        {(canDelete || canPin) && (
          <div className="flex shrink-0 items-center gap-2">
            {canPin && (
              <button
                type="button"
                onClick={() => onPin(comment)}
                disabled={pinningId === comment?._id}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-60"
                title={comment?.isPinned ? "Unpin comment" : "Pin comment"}
              >
                {pinningId === comment?._id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Pin size={16} />
                )}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                disabled={deletingId === comment?._id}
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                title="Delete comment"
              >
                {deletingId === comment?._id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

const LessonComments = ({ courseId, lessonId }) => {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replyingId, setReplyingId] = useState("");
  const [replyingReplyId, setReplyingReplyId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deletingReplyId, setDeletingReplyId] = useState("");
  const [pinningId, setPinningId] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canLoadComments = Boolean(courseId && lessonId);

  const discussionCount = useMemo(() => {
    return comments.reduce((total, comment) => {
      return (
        total +
        1 +
        (Array.isArray(comment?.replies) ? comment.replies.length : 0)
      );
    }, 0);
  }, [comments]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a?.isPinned && !b?.isPinned) return -1;
      if (!a?.isPinned && b?.isPinned) return 1;

      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });
  }, [comments]);

  const fetchComments = async () => {
    if (!canLoadComments) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/lesson-comments/course/${courseId}/lesson/${lessonId}`,
      );

      const loadedComments =
        response.data?.comments || response.data?.data || [];

      setComments(Array.isArray(loadedComments) ? loadedComments : []);
    } catch (error) {
      console.error("LESSON_COMMENTS_FETCH_ERROR:", error);

      setError(
        error?.response?.data?.message || "Unable to load comments right now.",
      );

      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMessage("");
    setSuccessMessage("");
    fetchComments();
  }, [courseId, lessonId]);

  const handleSubmitComment = async (event) => {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage) return;

    if (cleanMessage.length > 1000) {
      setError("Comment should be less than 1000 characters.");
      return;
    }

    try {
      setPosting(true);
      setError("");
      setSuccessMessage("");

      const response = await api.post(
        `/lesson-comments/course/${courseId}/lesson/${lessonId}`,
        { message: cleanMessage },
      );

      const createdComment = response.data?.comment;

      if (createdComment) {
        setComments((previous) => [createdComment, ...previous]);
      } else {
        await fetchComments();
      }

      setMessage("");
      setSuccessMessage("Comment posted successfully.");
    } catch (error) {
      console.error("LESSON_COMMENT_CREATE_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          "Unable to post comment. Please try again.",
      );
    } finally {
      setPosting(false);
    }
  };

  const handleReplyComment = async (comment, replyMessage, replyTarget) => {
    const cleanMessage = replyMessage.trim();

    if (!cleanMessage) return false;

    if (cleanMessage.length > 1000) {
      setError("Reply should be less than 1000 characters.");
      return false;
    }

    const currentReplyingReplyId = replyTarget?.replyToReplyId
      ? `${comment?._id}:${replyTarget.replyToReplyId}`
      : "";

    try {
      if (currentReplyingReplyId) {
        setReplyingReplyId(currentReplyingReplyId);
      } else {
        setReplyingId(comment?._id);
      }

      setError("");
      setSuccessMessage("");

      const payload = {
        message: cleanMessage,
      };

      if (replyTarget?.replyToReplyId) {
        payload.replyToReplyId = replyTarget.replyToReplyId;
        payload.replyToUserId = replyTarget.replyToUserId;
        payload.replyToName = replyTarget.replyToName;
      }

      const response = await api.post(
        `/lesson-comments/${comment?._id}/replies`,
        payload,
      );

      const updatedComment = response.data?.comment;

      if (updatedComment) {
        setComments((previous) =>
          previous.map((item) =>
            item?._id === updatedComment?._id ? updatedComment : item,
          ),
        );
      } else {
        await fetchComments();
      }

      setSuccessMessage("Reply added successfully.");
      return true;
    } catch (error) {
      console.error("LESSON_COMMENT_REPLY_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          "Unable to add reply. Please try again.",
      );

      return false;
    } finally {
      setReplyingId("");
      setReplyingReplyId("");
    }
  };

  const handleDeleteComment = async (comment) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(comment?._id);
      setError("");
      setSuccessMessage("");

      await api.delete(`/lesson-comments/${comment?._id}`);

      setComments((previous) =>
        previous.filter((item) => item?._id !== comment?._id),
      );

      setSuccessMessage("Comment deleted successfully.");
    } catch (error) {
      console.error("LESSON_COMMENT_DELETE_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          "Unable to delete comment. Please try again.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleDeleteReply = async (comment, replyItem) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this reply?",
    );

    if (!confirmDelete) return;

    const currentDeletingId = `${comment?._id}:${replyItem?._id}`;

    try {
      setDeletingReplyId(currentDeletingId);
      setError("");
      setSuccessMessage("");

      const response = await api.delete(
        `/lesson-comments/${comment?._id}/replies/${replyItem?._id}`,
      );

      const updatedComment = response.data?.comment;

      if (updatedComment) {
        setComments((previous) =>
          previous.map((item) =>
            item?._id === updatedComment?._id ? updatedComment : item,
          ),
        );
      } else {
        await fetchComments();
      }

      setSuccessMessage("Reply deleted successfully.");
    } catch (error) {
      console.error("LESSON_COMMENT_REPLY_DELETE_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          "Unable to delete reply. Please try again.",
      );
    } finally {
      setDeletingReplyId("");
    }
  };

  const handlePinComment = async (comment) => {
    try {
      setPinningId(comment?._id);
      setError("");
      setSuccessMessage("");

      const response = await api.patch(`/lesson-comments/${comment?._id}/pin`);

      const updatedComment = response.data?.comment;

      if (updatedComment) {
        setComments((previous) =>
          previous.map((item) =>
            item?._id === updatedComment?._id ? updatedComment : item,
          ),
        );
      } else {
        await fetchComments();
      }

      setSuccessMessage(
        comment?.isPinned
          ? "Comment unpinned successfully."
          : "Comment pinned successfully.",
      );
    } catch (error) {
      console.error("LESSON_COMMENT_PIN_ERROR:", error);

      setError(
        error?.response?.data?.message || "Unable to update pinned comment.",
      );
    } finally {
      setPinningId("");
    }
  };

  if (!canLoadComments) return null;

  return (
    <section className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
            <MessageCircle size={22} />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Lesson Discussion</h2>

            <p className="mt-1 text-sm text-slate-400">
              Ask doubts, reply to comments, and reply exactly where you are
              reading.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-sm font-bold text-slate-300">
          {discussionCount} messages
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-100">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              user?.role === "admin"
                ? "Write an admin message for this lesson..."
                : "Ask a doubt or comment about this lesson..."
            }
            rows={3}
            maxLength={1000}
            className="w-full resize-none bg-transparent p-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <p className="text-xs text-slate-500">
              {message.length}/1000 characters
            </p>

            <button
              type="submit"
              disabled={posting || !message.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {posting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Post Comment
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <p className="mt-3 text-sm text-slate-400">Loading comments...</p>
        </div>
      ) : sortedComments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
            <MessageCircle size={27} />
          </div>

          <h3 className="mt-4 font-black text-white">No comments yet</h3>

          <p className="mt-2 text-sm text-slate-400">
            Start the discussion for this lesson.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <CommentCard
              key={comment?._id}
              comment={comment}
              currentUser={user}
              deletingId={deletingId}
              deletingReplyId={deletingReplyId}
              pinningId={pinningId}
              replyingId={replyingId}
              replyingReplyId={replyingReplyId}
              onDelete={handleDeleteComment}
              onDeleteReply={handleDeleteReply}
              onPin={handlePinComment}
              onReply={handleReplyComment}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default LessonComments;
