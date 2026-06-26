import { useEffect, useMemo, useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const CourseReviews = ({ courseId }) => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const myReview = useMemo(() => {
    if (!user?._id && !user?.id) return null;

    const userId = String(user._id || user.id);

    return reviews.find((review) => {
      const reviewUserId =
        review.userId?._id || review.userId?.id || review.userId;

      return String(reviewUserId) === userId;
    });
  }, [reviews, user]);

  const fetchReviews = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/reviews/course/${courseId}`);

      setReviews(res.data.reviews || []);
      setStats(
        res.data.stats || {
          averageRating: 0,
          totalReviews: 0,
        },
      );
    } catch (error) {
      console.error("FETCH_REVIEWS_ERROR:", error);

      setError(error.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating || 5);
      setComment(myReview.comment || "");
    }
  }, [myReview]);

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!courseId) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const res = await api.post(`/reviews/course/${courseId}`, {
        rating,
        comment,
      });

      setStats(res.data.stats);
      setSuccessMessage("Review saved successfully");

      await fetchReviews();
    } catch (error) {
      console.error("SAVE_REVIEW_ERROR:", error);

      setError(
        error.response?.data?.message ||
          "Failed to save review. Only enrolled students can review this course.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!courseId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete your review?",
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      setError("");
      setSuccessMessage("");

      const res = await api.delete(`/reviews/course/${courseId}`);

      setStats(res.data.stats);
      setRating(5);
      setComment("");
      setSuccessMessage("Review deleted successfully");

      await fetchReviews();
    } catch (error) {
      console.error("DELETE_REVIEW_ERROR:", error);

      setError(error.response?.data?.message || "Failed to delete review");
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = (value, clickable = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((starValue) => {
          const filled = starValue <= value;

          if (clickable) {
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => setRating(starValue)}
                className={`transition hover:scale-110 ${
                  filled ? "text-yellow-400" : "text-slate-600"
                }`}
              >
                <Star size={24} fill={filled ? "currentColor" : "none"} />
              </button>
            );
          }

          return (
            <Star
              key={starValue}
              size={18}
              className={filled ? "text-yellow-400" : "text-slate-600"}
              fill={filled ? "currentColor" : "none"}
            />
          );
        })}
      </div>
    );
  };

  if (!courseId) return null;

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
            Student Feedback
          </p>

          <h2 className="mt-3 text-2xl md:text-3xl font-black text-white">
            Reviews & Ratings
          </h2>

          <p className="mt-2 text-slate-400">
            See what students say about this course.
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-black text-yellow-300">
              {stats.averageRating || 0}
            </p>

            <div>
              {renderStars(Math.round(stats.averageRating || 0))}

              <p className="mt-1 text-sm text-slate-400">
                {stats.totalReviews || 0} review
                {(stats.totalReviews || 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={22} />
          Loading reviews...
        </div>
      ) : (
        <>
          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
              {successMessage}
            </div>
          )}

          {user ? (
            <form
              onSubmit={handleSubmitReview}
              className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">
                    {myReview ? "Update your review" : "Write a review"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    Only enrolled students can submit a review.
                  </p>
                </div>

                {myReview && (
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <Trash2 size={18} />
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-slate-300">
                  Your rating
                </p>

                {renderStars(rating, true)}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Your comment
                </label>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Share your experience with this course..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-slate-300">
                Please login to write a review.
              </p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-slate-400">
                No reviews yet. Be the first enrolled student to review this
                course.
              </div>
            ) : (
              reviews.map((review) => (
                <article
                  key={review._id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="font-black text-white">
                        {review.userId?.name || "Student"}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>

                    {renderStars(review.rating || 0)}
                  </div>

                  {review.comment && (
                    <p className="mt-4 leading-7 text-slate-300">
                      {review.comment}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default CourseReviews;