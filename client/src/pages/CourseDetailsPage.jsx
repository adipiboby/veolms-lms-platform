import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  Loader2,
  Lock,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CourseReviews from "../components/reviews/CourseReviews";

const formatCurrency = (amount = 0) => {
  const value = Number(amount || 0);

  if (value === 0) return "Free";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const getCourseImage = (course) => {
  return (
    course?.thumbnail ||
    course?.thumbnailUrl ||
    course?.image ||
    course?.coverImage ||
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop"
  );
};

const getPreviewVideoUrl = (course) => {
  return (
    course?.trailer ||
    course?.trailerUrl ||
    course?.trailerVideoUrl ||
    course?.previewUrl ||
    course?.previewVideoUrl ||
    ""
  );
};

const getYouTubeEmbedUrl = (url = "") => {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "");

    if (hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        const videoId = parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        const videoId = parsedUrl.pathname.split("/embed/")[1]?.split("/")[0];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
    }

    if (hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "").split("?")[0];

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return "";
  } catch {
    return "";
  }
};

const isDirectVideoUrl = (url = "") => {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
};

const CoursePreviewPlayer = ({ course }) => {
  const previewUrl = getPreviewVideoUrl(course);
  const poster = getCourseImage(course);

  if (!previewUrl) {
    return (
      <div className="relative aspect-video overflow-hidden">
        <img
          src={poster}
          alt={course?.title || "Course preview"}
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur md:h-20 md:w-20">
            <PlayCircle size={38} />
          </div>
        </div>
      </div>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(previewUrl);

  if (youtubeEmbedUrl) {
    return (
      <iframe
        src={youtubeEmbedUrl}
        title={course?.title || "Course preview"}
        className="aspect-video w-full bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  if (isDirectVideoUrl(previewUrl)) {
    return (
      <video
        controls
        className="aspect-video w-full bg-black object-cover"
        poster={poster}
        src={previewUrl}
      />
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-black px-6 text-center">
      <div>
        <PlayCircle size={42} className="mx-auto text-slate-500" />

        <p className="mt-4 text-lg font-black text-white">
          Preview video link is not playable
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Use a YouTube link or a direct MP4/WebM video URL.
        </p>
      </div>
    </div>
  );
};

const getCourseRating = (course) => {
  return Number(
    course?.averageRating ||
      course?.rating ||
      course?.ratingsAverage ||
      course?.avgRating ||
      0,
  );
};

const getCourseReviewsCount = (course) => {
  return Number(
    course?.totalReviews ||
      course?.reviewsCount ||
      course?.reviewCount ||
      course?.ratingsQuantity ||
      0,
  );
};

const getCourseEnrollments = (course) => {
  return Number(
    course?.totalEnrollments ||
      course?.enrollments ||
      course?.enrollmentsCount ||
      course?.studentsCount ||
      0,
  );
};

const getCourseLessons = (course) => {
  if (!Array.isArray(course?.sections)) return [];

  return course.sections.flatMap((section) =>
    Array.isArray(section.lessons)
      ? section.lessons.map((lesson) => ({
          ...lesson,
          sectionId: section._id,
          sectionTitle: section.title,
        }))
      : [],
  );
};

const getLessonId = (lesson) => {
  return lesson?._id || lesson?.id || lesson?.lessonId || "";
};

const getCourseDuration = (course) => {
  return (
    course?.duration ||
    course?.totalDuration ||
    course?.durationText ||
    course?.estimatedDuration ||
    "Lifetime"
  );
};

const getProgressPercentage = (progress, lessons = []) => {
  const progressValue = Number(progress?.progressPercentage);

  if (Number.isFinite(progressValue) && progressValue >= 0) {
    return Math.min(100, Math.max(0, Math.round(progressValue)));
  }

  const totalLessons = Number(progress?.totalLessons || lessons.length || 0);
  const completedLessons = Number(progress?.completedLessons || 0);

  if (!totalLessons) return 0;

  return Math.min(
    100,
    Math.max(0, Math.round((completedLessons / totalLessons) * 100)),
  );
};

const getCompletedLessonIds = (progress) => {
  if (!Array.isArray(progress?.lessonProgress)) return new Set();

  return new Set(
    progress.lessonProgress
      .filter((item) => item?.isCompleted || item?.completed)
      .map((item) => String(item.lessonId || item._id || item.id || ""))
      .filter(Boolean),
  );
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const getFriendlyPaymentError = (error) => {
  const status = error?.response?.status;

  console.error("PAYMENT_ERROR_DETAILS:", {
    status,
    backendMessage: error?.response?.data?.message,
    error,
  });

  if (status === 404) {
    return "Payment service is currently unavailable. Please try again later.";
  }

  if (status === 401) {
    return "Please login first to buy this course.";
  }

  if (status === 403) {
    return "You do not have permission to buy this course.";
  }

  if (status >= 500) {
    return "Payment server is facing an issue. Please try again after some time.";
  }

  return "Unable to start payment. Please try again.";
};

const getFriendlyPageError = (error) => {
  const status = error?.response?.status;

  console.error("COURSE_DETAILS_ERROR:", {
    status,
    backendMessage: error?.response?.data?.message,
    error,
  });

  if (status === 404) {
    return "Course not found or no longer available.";
  }

  if (status >= 500) {
    return "Server is facing an issue while loading this course.";
  }

  return "Failed to load course details.";
};

const tryApiPost = async (endpoints, body) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await api.post(endpoint, body);
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

const tryApiGet = async (endpoints) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await api.get(endpoint);
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

const InfoItem = ({ icon: Icon, text, tone = "blue" }) => {
  const toneClasses = {
    blue: "text-blue-600 dark:text-blue-300",
    green: "text-green-600 dark:text-green-300",
    yellow: "text-yellow-600 dark:text-yellow-300",
    purple: "text-purple-600 dark:text-purple-300",
  };

  return (
    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
      <Icon
        size={21}
        className={`mt-0.5 shrink-0 ${toneClasses[tone] || toneClasses.blue}`}
      />

      <span className="leading-6">{text}</span>
    </div>
  );
};

const PurchaseCard = ({
  price,
  isAdmin,
  isEnrolled,
  paymentLoading,
  paymentError,
  onBuyNow,
  onContinue,
}) => {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
        {isAdmin ? "Admin Access" : "Course Price"}
      </p>

      <h2 className="mt-4 break-words text-5xl font-black text-slate-950 dark:text-white">
        {isAdmin ? "Preview" : formatCurrency(price)}
      </h2>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {isAdmin
          ? "Open your course learning page, watch lessons, and reply to student comments."
          : "One-time payment. Lifetime course access."}
      </p>

      {paymentError && !isAdmin && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          {paymentError}
        </div>
      )}

      {isAdmin ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 text-center font-black text-white hover:bg-blue-700"
        >
          Open Learning Page
        </button>
      ) : isEnrolled ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-2xl bg-green-600 px-6 py-4 text-center font-black text-white hover:bg-green-700"
        >
          Continue Learning
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuyNow}
          disabled={paymentLoading}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-4 text-center font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paymentLoading ? "Please wait..." : "Buy Now"}
        </button>
      )}

      <div className="mt-7 space-y-5">
        {isAdmin ? (
          <>
            <InfoItem
              icon={ShieldCheck}
              text="Admin can open the course without payment"
              tone="green"
            />

            <InfoItem
              icon={Video}
              text="Preview protected course videos"
              tone="blue"
            />

            <InfoItem
              icon={BookOpen}
              text="Check lessons, curriculum, and resources"
              tone="purple"
            />

            <InfoItem
              icon={ShieldCheck}
              text="Reply to student lesson comments"
              tone="yellow"
            />
          </>
        ) : (
          <>
            <InfoItem
              icon={ShieldCheck}
              text="Secure payment and protected videos"
              tone="green"
            />

            <InfoItem
              icon={Award}
              text="Certificate after completion"
              tone="yellow"
            />

            <InfoItem
              icon={Star}
              text="Lifetime access after enrollment"
              tone="blue"
            />

            <InfoItem icon={Lock} text="Private video playback" tone="purple" />
          </>
        )}
      </div>
    </div>
  );
};

const EnrolledMobileCourseView = ({
  course,
  lessons,
  progress,
  onBack,
  onContinue,
  onOpenLesson,
}) => {
  const completedLessonIds = useMemo(
    () => getCompletedLessonIds(progress),
    [progress],
  );
  const progressPercentage = getProgressPercentage(progress, lessons);
  const totalLessons = Number(progress?.totalLessons || lessons.length || 0);
  const completedLessons = Number(
    progress?.completedLessons || completedLessonIds.size || 0,
  );

  const currentLesson = useMemo(() => {
    if (!lessons.length) return null;

    return (
      lessons.find(
        (lesson) => !completedLessonIds.has(String(getLessonId(lesson))),
      ) || lessons[0]
    );
  }, [completedLessonIds, lessons]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 pb-28 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white lg:hidden">
      <section className="border-b border-slate-200 bg-white/95 px-4 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-black text-violet-700 dark:text-violet-300"
        >
          <ArrowLeft size={18} />
          My Courses
        </button>
      </section>

      <section className="px-4 py-5">
        <div className="overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/30">
          <div className="p-5">
            <div className="flex gap-4">
              <img
                src={getCourseImage(course)}
                alt={course?.title || "Course"}
                className="h-24 w-24 shrink-0 rounded-3xl object-cover"
              />

              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700 ring-1 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/20">
                  <CheckCircle size={14} />
                  Enrolled
                </span>

                <h1 className="mt-3 break-words text-2xl font-black leading-tight text-slate-950 dark:text-white">
                  {course?.title}
                </h1>

                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {course?.shortDescription ||
                    course?.description ||
                    "Build modern, scalable applications with structured lessons."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>
                  <span className="font-black text-violet-700 dark:text-violet-300">
                    {progressPercentage}%
                  </span>{" "}
                  Complete
                </span>

                <span>
                  {completedLessons} of {totalLessons || lessons.length} lessons
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onContinue(currentLesson)}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-green-500/20 transition hover:bg-green-700"
            >
              <PlayCircle size={21} />
              Continue Learning
            </button>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 sm:grid-cols-4 sm:divide-y-0">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <BookOpen size={21} />
              </div>

              <div>
                <p className="text-lg font-black">{lessons.length}</p>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Lessons
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <Clock size={21} />
              </div>

              <div>
                <p className="text-lg font-black">
                  {getCourseDuration(course)}
                </p>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Duration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <Award size={21} />
              </div>

              <div>
                <p className="text-lg font-black">Certificate</p>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Included
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <ShieldCheck size={21} />
              </div>

              <div>
                <p className="text-lg font-black">Secure</p>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Videos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">
            Course Content
          </h2>

          <span className="text-sm font-black text-violet-700 dark:text-violet-300">
            Expand all
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
            Lessons will be added soon.
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, index) => {
              const lessonId = String(getLessonId(lesson));
              const isCompleted = completedLessonIds.has(lessonId);
              const isCurrent =
                currentLesson &&
                lessonId === String(getLessonId(currentLesson));

              return (
                <button
                  key={lessonId || `${lesson.title}-${index}`}
                  type="button"
                  onClick={() => onOpenLesson(lesson)}
                  className={`w-full rounded-[1.45rem] border bg-white p-5 text-left shadow-lg shadow-slate-200/60 transition active:scale-[0.99] dark:bg-white/[0.05] dark:shadow-black/20 ${
                    isCurrent
                      ? "border-violet-300 ring-1 ring-violet-200 dark:border-violet-400/50 dark:ring-violet-400/20"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                        isCompleted
                          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                          : isCurrent
                            ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white"
                            : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-200"
                      }`}
                    >
                      {isCompleted ? <CheckCircle size={25} /> : index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-black leading-snug text-slate-950 dark:text-white">
                            {lesson.title || `Lesson ${index + 1}`}
                          </h3>

                          {lesson.description && (
                            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                              {lesson.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                            isCompleted
                              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                              : isCurrent
                                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          {isCompleted
                            ? "Completed"
                            : isCurrent
                              ? "In Progress"
                              : "Upcoming"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <Video size={16} />
                          Video Lesson
                        </span>

                        <span>•</span>

                        <span>{lesson.duration || "Video lesson"}</span>
                      </div>

                      {isCurrent && (
                        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white">
                                <PlayCircle size={19} />
                              </span>
                              Continue where you left off
                            </span>

                            <span>{progressPercentage}%</span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {course?._id && (
        <section className="px-4 pb-8">
          <CourseReviews courseId={course._id} />
        </section>
      )}
    </main>
  );
};

const CourseDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [courseProgress, setCourseProgress] = useState(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [lessonSearch, setLessonSearch] = useState("");

  const isAdmin = user?.role === "admin";

  const lessons = useMemo(() => getCourseLessons(course), [course]);

  const shouldShowLessonSearch = lessons.length > 10;

  const filteredSections = useMemo(() => {
    if (!Array.isArray(course?.sections)) return [];

    const query = lessonSearch.trim().toLowerCase();

    if (!shouldShowLessonSearch || !query) {
      return course.sections;
    }

    return course.sections
      .map((section) => {
        const filteredLessons = Array.isArray(section.lessons)
          ? section.lessons.filter((lesson) => {
              return (
                String(lesson.title || "")
                  .toLowerCase()
                  .includes(query) ||
                String(lesson.duration || "")
                  .toLowerCase()
                  .includes(query) ||
                String(section.title || "")
                  .toLowerCase()
                  .includes(query)
              );
            })
          : [];

        return {
          ...section,
          lessons: filteredLessons,
        };
      })
      .filter((section) => section.lessons.length > 0);
  }, [course?.sections, lessonSearch, shouldShowLessonSearch]);

  const rating = getCourseRating(course);
  const reviewsCount = getCourseReviewsCount(course);
  const enrollments = getCourseEnrollments(course);
  const price = Number(course?.price || 0);
  const shouldShowEnrolledMobileView =
    isAuthenticated && isEnrolled && !isAdmin;

  const fetchCourseProgress = async (courseId) => {
    if (!courseId || !isAuthenticated || isAdmin) return null;

    try {
      const progressRes = await tryApiGet([
        `/progress/course/${courseId}`,
        `/progress/${courseId}`,
      ]);

      const progressData =
        progressRes.data?.progress ||
        progressRes.data?.data ||
        progressRes.data;

      setCourseProgress(progressData);
      return progressData;
    } catch (error) {
      console.warn(
        "Course progress check skipped:",
        error?.response?.data || error.message,
      );
      setCourseProgress(null);
      return null;
    }
  };

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setPageError("");
      setPaymentError("");
      setCourseProgress(null);

      const courseRes = await tryApiGet([
        `/courses/${slug}`,
        `/courses/slug/${slug}`,
      ]);

      const loadedCourse =
        courseRes.data?.course || courseRes.data?.data || courseRes.data;

      setCourse(loadedCourse);

      const courseId = loadedCourse?._id;

      if (user?.role === "admin") {
        setIsEnrolled(false);
        return;
      }

      let enrolledValue = Boolean(loadedCourse?.isEnrolled);

      if (courseId && isAuthenticated) {
        try {
          const enrollmentRes = await tryApiGet([
            `/enrollments/status/${courseId}`,
            `/enrollments/check/${courseId}`,
            `/enrollments/is-enrolled/${courseId}`,
          ]);

          enrolledValue = Boolean(
            enrollmentRes.data?.isEnrolled ||
            enrollmentRes.data?.enrolled ||
            loadedCourse?.isEnrolled,
          );
        } catch (error) {
          console.warn("Enrollment check skipped:", error?.response?.data);
        }
      }

      setIsEnrolled(enrolledValue);

      if (courseId && enrolledValue) {
        await fetchCourseProgress(courseId);
      }
    } catch (error) {
      setPageError(getFriendlyPageError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [slug, isAuthenticated, user?.role]);

  const getContinueLesson = (preferredLesson) => {
    if (preferredLesson) return preferredLesson;

    const completedLessonIds = getCompletedLessonIds(courseProgress);

    return (
      lessons.find(
        (lesson) => !completedLessonIds.has(String(getLessonId(lesson))),
      ) ||
      lessons[0] ||
      null
    );
  };

  const openLearningPage = (lesson) => {
    if (!course?.slug) return;

    const targetLesson = getContinueLesson(lesson);
    const lessonId = getLessonId(targetLesson);
    const lessonQuery = lessonId ? `?lessonId=${lessonId}` : "";

    navigate(`/learn/${course.slug}${lessonQuery}`);
  };

  const handleFreeEnrollment = async () => {
    await tryApiPost(
      [
        "/enrollments/create",
        "/enrollments/enroll",
        "/enrollments",
        "/payments/free-enroll",
      ],
      {
        courseId: course._id,
      },
    );

    setIsEnrolled(true);
    await fetchCourseProgress(course._id);
    openLearningPage();
  };

  const handleContinue = (lesson) => {
    if (!course?.slug) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    openLearningPage(lesson);
  };

  const handleBuyNow = async () => {
    if (!course?._id) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role === "admin") {
      handleContinue();
      return;
    }

    if (isEnrolled) {
      handleContinue();
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");

      if (price === 0) {
        await handleFreeEnrollment();
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setPaymentError(
          "Payment checkout failed to load. Please check your internet and try again.",
        );
        return;
      }

      const orderRes = await tryApiPost(
        [
          "/payments/create-order",
          "/payments/create",
          "/payments/order",
          "/payments/razorpay/create-order",
        ],
        {
          courseId: course._id,
        },
      );

      const orderData = orderRes.data || {};
      const order = orderData.order || orderData.data?.order || orderData;

      const razorpayOrderId =
        order.id ||
        order.orderId ||
        order.razorpayOrderId ||
        orderData.orderId ||
        orderData.razorpayOrderId;

      const razorpayKey =
        orderData.key ||
        orderData.keyId ||
        orderData.razorpayKeyId ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;

      const amount = order.amount || orderData.amount || price * 100;
      const currency = order.currency || orderData.currency || "INR";

      if (!razorpayOrderId || !razorpayKey) {
        console.error("INVALID_RAZORPAY_ORDER_RESPONSE:", orderData);

        setPaymentError(
          "Payment service is not configured properly. Please try again later.",
        );

        return;
      }

      const options = {
        key: razorpayKey,
        amount,
        currency,
        name: "VeoLMS",
        description: course.title,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        notes: {
          courseId: course._id,
          courseTitle: course.title,
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response) => {
          try {
            setPaymentLoading(true);
            setPaymentError("");

            await tryApiPost(
              [
                "/payments/verify",
                "/payments/verify-payment",
                "/payments/razorpay/verify",
              ],
              {
                courseId: course._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            );

            setIsEnrolled(true);
            await fetchCourseProgress(course._id);
            openLearningPage();
          } catch (error) {
            setPaymentError(getFriendlyPaymentError(error));
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setPaymentError(getFriendlyPaymentError(error));
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-50 p-6 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <Loader2
            className="animate-spin text-blue-500 dark:text-blue-400"
            size={44}
          />

          <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
            Loading course details...
          </p>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-50 p-6 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="mx-auto max-w-4xl">
          <Link
            to={isAdmin ? "/admin/courses" : "/courses"}
            className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={18} />
            {isAdmin ? "Back to admin courses" : "Back to courses"}
          </Link>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle size={28} />
              <h1 className="text-2xl font-black">Course Error</h1>
            </div>

            <p className="mt-4 text-slate-700 dark:text-slate-300">
              {pageError}
            </p>

            <button
              type="button"
              onClick={fetchCourseDetails}
              className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {shouldShowEnrolledMobileView && (
        <EnrolledMobileCourseView
          course={course}
          lessons={lessons}
          progress={courseProgress}
          onBack={() => navigate("/courses")}
          onContinue={handleContinue}
          onOpenLesson={handleContinue}
        />
      )}

      <main
        className={`${
          shouldShowEnrolledMobileView ? "hidden lg:block" : ""
        } min-h-screen overflow-x-hidden bg-slate-50 pb-36 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white lg:pb-0`}
      >
        <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.08),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0),rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.16),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,1))]" />

          <div className="relative mx-auto max-w-7xl px-4 py-6 md:py-10">
            <Link
              to={isAdmin ? "/admin/courses" : "/courses"}
              className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft size={18} />
              {isAdmin ? "Back to admin courses" : "Back to courses"}
            </Link>

            {isAdmin && (
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold leading-6 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                Admin mode: you can open the learning page without buying.
              </div>
            )}

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap gap-3">
                {course?.category && (
                  <span className="max-w-full truncate rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
                    {course.category}
                  </span>
                )}

                {course?.level && (
                  <span className="max-w-full truncate rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-black text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/15 dark:text-purple-200">
                    {course.level}
                  </span>
                )}

                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700 dark:border-green-400/30 dark:bg-green-500/15 dark:text-green-200">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span className="truncate">Secure Videos</span>
                </span>
              </div>

              <h1 className="max-w-5xl break-words text-3xl font-black leading-tight text-slate-950 md:text-5xl dark:text-white">
                {course?.title}
              </h1>

              <p className="mt-5 max-w-4xl break-words text-base leading-7 text-slate-700 md:text-lg md:leading-8 dark:text-slate-300">
                {course?.shortDescription ||
                  course?.description ||
                  "Learn practical skills with structured lessons, secure videos, progress tracking, notes, reviews, and certificates."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-4xl">
                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <Star
                    size={18}
                    className="shrink-0 fill-yellow-400 text-yellow-400 dark:fill-yellow-300 dark:text-yellow-300"
                  />

                  <span className="font-black text-slate-950 dark:text-white">
                    {rating > 0 ? rating.toFixed(1) : "New"}
                  </span>

                  <span className="truncate text-slate-600 dark:text-slate-400">
                    ({reviewsCount} reviews)
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <Users
                    size={18}
                    className="shrink-0 text-blue-600 dark:text-blue-300"
                  />

                  <span className="font-black text-slate-950 dark:text-white">
                    {enrollments}
                  </span>

                  <span className="truncate text-slate-600 dark:text-slate-400">
                    students
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <BookOpen
                    size={18}
                    className="shrink-0 text-green-600 dark:text-green-300"
                  />

                  <span className="font-black text-slate-950 dark:text-white">
                    {lessons.length}
                  </span>

                  <span className="truncate text-slate-600 dark:text-slate-400">
                    lessons
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div className="min-w-0 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-black/30 dark:shadow-none">
                <CoursePreviewPlayer course={course} />
              </div>

              <aside className="hidden lg:block">
                <PurchaseCard
                  price={price}
                  isAdmin={isAdmin}
                  isEnrolled={isEnrolled}
                  paymentLoading={paymentLoading}
                  paymentError={paymentError}
                  onBuyNow={handleBuyNow}
                  onContinue={handleContinue}
                />
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
          {paymentError && !isAdmin && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 lg:hidden dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              {paymentError}
            </div>
          )}

          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-8">
              <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <Sparkles size={24} />
                  </div>

                  <h2 className="text-2xl font-black text-slate-950 md:text-3xl dark:text-white">
                    What you will learn
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    "Understand concepts with practical lessons",
                    "Watch secure course videos after enrollment",
                    "Track your progress lesson by lesson",
                    "Take notes while learning each lesson",
                    "Review the course after learning",
                    "Get certificate after completion",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <CheckCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-green-600 dark:text-green-300"
                      />

                      <p className="break-words text-slate-700 dark:text-slate-300">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                    <Layers size={24} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-2xl font-black text-slate-950 md:text-3xl dark:text-white">
                      Course Curriculum
                    </h2>

                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      {lessons.length} lessons included
                    </p>
                  </div>
                </div>

                {shouldShowLessonSearch && (
                  <div className="mb-6">
                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                      />

                      <input
                        type="text"
                        value={lessonSearch}
                        onChange={(event) =>
                          setLessonSearch(event.target.value)
                        }
                        placeholder="Search lessons..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-4 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                      />

                      {lessonSearch && (
                        <button
                          type="button"
                          onClick={() => setLessonSearch("")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <X size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!Array.isArray(course?.sections) ||
                course.sections.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
                    Curriculum will be updated soon.
                  </div>
                ) : filteredSections.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
                    No lessons found for your search.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSections.map((section) => (
                      <div
                        key={section._id || section.title}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/60"
                      >
                        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                          <h3 className="break-words text-lg font-black text-slate-950 dark:text-white">
                            {section.title}
                          </h3>
                        </div>

                        <div className="divide-y divide-slate-200 dark:divide-white/10">
                          {section.lessons?.map((lesson, index) => (
                            <div
                              key={lesson._id || lesson.title}
                              className="flex items-center justify-between gap-4 px-5 py-4"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                  <Video size={17} />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-bold text-slate-950 dark:text-white">
                                    {index + 1}. {lesson.title}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {lesson.duration || "Video lesson"}
                                  </p>
                                </div>
                              </div>

                              {lesson.isPreview || isAdmin ? (
                                <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
                                  {isAdmin ? "Accessible" : "Preview"}
                                </span>
                              ) : (
                                <Lock
                                  size={17}
                                  className="shrink-0 text-slate-400 dark:text-slate-500"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <FileText size={24} />
                  </div>

                  <h2 className="text-2xl font-black text-slate-950 md:text-3xl dark:text-white">
                    Course Description
                  </h2>
                </div>

                <p className="whitespace-pre-line break-words leading-8 text-slate-700 dark:text-slate-300">
                  {course?.description ||
                    course?.shortDescription ||
                    "This course is designed to help students learn practical skills through structured video lessons and hands-on learning."}
                </p>
              </div>

              {course?._id && isEnrolled && !isAdmin ? (
                <CourseReviews courseId={course._id} />
              ) : (
                course?._id &&
                !isAdmin && (
                  <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
                        <Star size={24} />
                      </div>

                      <h2 className="text-2xl font-black text-slate-950 md:text-3xl dark:text-white">
                        Course Reviews
                      </h2>
                    </div>

                    <p className="leading-7 text-slate-700 dark:text-slate-300">
                      Enroll and learn this course to share your rating and
                      review.
                    </p>
                  </div>
                )
              )}
            </div>

            <aside className="hidden lg:block">
              <div className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                  Course Benefits
                </h3>

                <div className="mt-5 space-y-5">
                  <InfoItem
                    icon={ShieldCheck}
                    text="Secure payment and protected videos"
                    tone="green"
                  />

                  <InfoItem
                    icon={Award}
                    text="Certificate after completion"
                    tone="yellow"
                  />

                  <InfoItem
                    icon={Star}
                    text="Lifetime access after enrollment"
                    tone="blue"
                  />

                  <InfoItem
                    icon={Clock}
                    text="Learn anytime at your own speed"
                    tone="purple"
                  />
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-[80] border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-slate-300/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black lg:hidden">
          {paymentError && !isAdmin && (
            <div className="mx-auto mb-3 max-w-7xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              {paymentError}
            </div>
          )}

          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {isAdmin ? "Access" : "Price"}
              </p>

              <p className="truncate text-2xl font-black text-slate-950 dark:text-white">
                {isAdmin ? "Admin Preview" : formatCurrency(price)}
              </p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleContinue}
                className="shrink-0 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700"
              >
                Open Course
              </button>
            ) : isEnrolled ? (
              <button
                type="button"
                onClick={handleContinue}
                className="shrink-0 rounded-2xl bg-green-600 px-6 py-4 text-sm font-black text-white hover:bg-green-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={paymentLoading}
                className="shrink-0 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paymentLoading ? "Wait..." : "Buy Now"}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default CourseDetailsPage;
