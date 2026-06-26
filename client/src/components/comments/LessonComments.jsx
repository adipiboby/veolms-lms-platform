import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
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

const getUserName = (comment) => {
  return comment?.userId?.name || comment?.user?.name || "User";
};

const getInitial = (name = "") => {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

const CommentCard = ({
  comment,
  currentUser,
  onDelete,
  onPin,
  deletingId,
  pinningId,
}) => {
  const authorName = getUserName(comment);
  const isAdminComment =
    comment?.role === "admin" || comment?.userId?.role === "admin";

  const isOwner =
    comment?.userId?._id?.toString() === currentUser?._id?.toString() ||
    comment?.userId?._id?.toString() === currentUser?.id?.toString();

  const canDelete = isOwner || currentUser?.role === "admin";
  const canPin = currentUser?.role === "admin";

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isAdminComment
          ? "border-blue-400/30 bg-blue-500/10"
          : "border-white/10 bg-slate-950/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black ${
            isAdminComment
              ? "bg-blue-500 text-white"
              : "bg-white/10 text-slate-200"
          }`}
        >
          {getInitial(authorName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-black text-white">{authorName}</h4>

            {isAdminComment && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-1 text-xs font-black text-blue-200">
                <ShieldCheck size={13} />
                Admin
              </span>
            )}

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
  const [deletingId, setDeletingId] = useState("");
  const [pinningId, setPinningId] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canLoadComments = Boolean(courseId && lessonId);

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
      console.error("LESSON_COMMENTS_FETCH_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setError("Unable to load comments right now.");
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
        {
          message: cleanMessage,
        },
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
      console.error("LESSON_COMMENT_CREATE_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setError(
        error?.response?.data?.message ||
          "Unable to post comment. Please try again.",
      );
    } finally {
      setPosting(false);
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

      setComments((previous) => {
        return previous.filter((item) => item?._id !== comment?._id);
      });

      setSuccessMessage("Comment deleted successfully.");
    } catch (error) {
      console.error("LESSON_COMMENT_DELETE_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setError("Unable to delete comment. Please try again.");
    } finally {
      setDeletingId("");
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
        setComments((previous) => {
          return previous.map((item) => {
            return item?._id === updatedComment?._id ? updatedComment : item;
          });
        });
      } else {
        await fetchComments();
      }

      setSuccessMessage(
        comment?.isPinned
          ? "Comment unpinned successfully."
          : "Comment pinned successfully.",
      );
    } catch (error) {
      console.error("LESSON_COMMENT_PIN_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setError("Unable to update pinned comment.");
    } finally {
      setPinningId("");
    }
  };

  if (!canLoadComments) {
    return null;
  }

  return (
    <section className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
              <MessageCircle size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Lesson Discussion
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Ask doubts and read admin responses for this lesson.
              </p>
            </div>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-sm font-bold text-slate-300">
          {comments.length} comments
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
              pinningId={pinningId}
              onDelete={handleDeleteComment}
              onPin={handlePinComment}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default LessonComments;
