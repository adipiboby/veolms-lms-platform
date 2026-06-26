import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  Loader2,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

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

const getCourseLessonsCount = (course) => {
  if (!Array.isArray(course?.sections))
    return Number(course?.lessonsCount || 0);

  return course.sections.reduce((total, section) => {
    return (
      total + (Array.isArray(section.lessons) ? section.lessons.length : 0)
    );
  }, 0);
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

const getCourseEnrollments = (course) => {
  return Number(
    course?.totalEnrollments ||
      course?.enrollments ||
      course?.enrollmentsCount ||
      course?.studentsCount ||
      0,
  );
};

const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;

  const text = String(duration).toLowerCase().trim();

  if (text.includes(":")) {
    const [minutes = "0", seconds = "0"] = text.split(":");
    return Number(minutes || 0) + Math.ceil(Number(seconds || 0) / 60);
  }

  if (text.includes("h")) {
    const hours = Number(text.match(/(\d+)\s*h/)?.[1] || 0);
    const minutes = Number(text.match(/(\d+)\s*m/)?.[1] || 0);
    return hours * 60 + minutes;
  }

  if (text.includes("m")) {
    return Number(text.match(/(\d+)\s*m/)?.[1] || 0);
  }

  return Number(text.replace(/\D/g, "") || 0);
};

const getCourseTotalMinutes = (course) => {
  if (!Array.isArray(course?.sections))
    return Number(course?.totalMinutes || 0);

  return course.sections.reduce((courseTotal, section) => {
    const lessons = Array.isArray(section.lessons) ? section.lessons : [];

    return (
      courseTotal +
      lessons.reduce((lessonTotal, lesson) => {
        return lessonTotal + parseDurationToMinutes(lesson?.duration);
      }, 0)
    );
  }, 0);
};

const formatLearningTime = (minutes = 0) => {
  const value = Number(minutes || 0);

  if (value <= 0) return "0m";

  if (value < 60) return `${value}m`;

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getEnrollmentProgress = (enrollment) => {
  const course = enrollment?.course;
  const progress = enrollment?.progress || {};

  const totalLessons =
    Number(progress?.totalLessons || enrollment?.totalLessons || 0) ||
    getCourseLessonsCount(course);

  const completedLessons = Number(
    progress?.completedLessons || enrollment?.completedLessons || 0,
  );

  const progressPercentage =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    completedLessons,
    progressPercentage: Math.min(
      100,
      Math.max(0, Number(progress?.progressPercentage ?? progressPercentage)),
    ),
  };
};

const StatBox = ({ value, label }) => {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20">
      <h3 className="text-3xl font-black text-white md:text-4xl">{value}</h3>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-400/20",
    green: "bg-green-500/10 text-green-300 border-green-400/20",
    purple: "bg-purple-500/10 text-purple-300 border-purple-400/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-400/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-400/20",
  };

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-white/[0.07]">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
          toneClasses[tone] || toneClasses.blue
        }`}
      >
        <Icon size={27} />
      </div>

      <h3 className="mt-5 text-xl font-black text-white">{title}</h3>

      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </article>
  );
};

const CourseCard = ({ course }) => {
  const lessonsCount = getCourseLessonsCount(course);
  const rating = getCourseRating(course);
  const enrollments = getCourseEnrollments(course);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-white/[0.07]">
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        <img
          src={getCourseImage(course)}
          alt={course?.title || "Course thumbnail"}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-black text-white backdrop-blur">
          Preview
        </div>

        <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur">
          <PlayCircle size={25} />
        </div>

        <div className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-2 text-sm font-black text-white backdrop-blur">
          {formatCurrency(course?.price)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-sm text-yellow-200">
            <Star
              size={15}
              className="shrink-0 fill-yellow-300 text-yellow-300"
            />
            <span className="font-black">
              {rating > 0 ? rating.toFixed(1) : "New"}
            </span>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-400">
            <Users size={15} />
            {enrollments}
          </div>
        </div>

        <h3 className="line-clamp-2 break-words text-xl font-black leading-tight text-white">
          {course?.title}
        </h3>

        <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-400">
          {course?.shortDescription ||
            course?.description ||
            "Learn through secure video lessons with progress tracking and certificates."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-300">
            <BookOpen size={16} className="shrink-0 text-blue-300" />
            <span className="truncate">{lessonsCount} lessons</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-300">
            <Clock size={16} className="shrink-0 text-green-300" />
            <span className="truncate">Lifetime</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Instructor
            </p>

            <p className="truncate font-bold text-slate-200">
              {course?.instructor ||
                course?.instructorName ||
                course?.createdBy?.name ||
                "VeoLMS Instructor"}
            </p>
          </div>

          <Link
            to={`/courses/${course?.slug || course?._id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            View
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
};

const StepCard = ({ number, title, description, icon: Icon }) => {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
          <Icon size={27} />
        </div>

        <span className="text-5xl font-black text-white/10">{number}</span>
      </div>

      <h3 className="mt-6 text-xl font-black text-white">{title}</h3>

      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </article>
  );
};

const DashboardPreview = ({
  course,
  stats,
  progress,
  isRealStudent,
  progressError,
}) => {
  const hasCourse = Boolean(course?._id || course?.slug || course?.title);

  const previewTitle = hasCourse
    ? course?.title
    : isRealStudent
      ? "No enrolled courses yet"
      : "Course progress appears here";

  const progressPercentage = isRealStudent
    ? Number(progress?.progressPercentage || 0)
    : 0;

  const completedLessons = Number(progress?.completedLessons || 0);
  const totalLessons =
    Number(progress?.totalLessons || 0) ||
    getCourseLessonsCount(course) ||
    stats.lessonsCount ||
    0;

  const totalMinutes = getCourseTotalMinutes(course) || stats.totalMinutes || 0;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
          <span className="h-3.5 w-3.5 rounded-full bg-yellow-400" />
          <span className="h-3.5 w-3.5 rounded-full bg-green-400" />
        </div>

        <p className="text-sm text-slate-400 md:text-base">
          {isRealStudent
            ? "Your Learning Progress"
            : "Student Dashboard Preview"}
        </p>
      </div>

      <div className="p-5 md:p-7">
        <div className="rounded-[1.5rem] bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 p-5 md:p-7">
          <p className="text-sm font-medium text-white/90 md:text-base">
            {isRealStudent
              ? hasCourse
                ? "Continue Learning"
                : "Start Learning"
              : "Platform Preview"}
          </p>

          <h3 className="mt-4 line-clamp-2 text-2xl font-black text-white">
            {previewTitle}
          </h3>

          <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-white/90 md:text-base">
            {isRealStudent ? (
              <>
                <span>{progressPercentage}% completed</span>
                <span>
                  {completedLessons}/{totalLessons} lessons
                </span>
              </>
            ) : (
              <>
                <span>Progress updates after enrollment</span>
                <span>{totalLessons} lessons</span>
              </>
            )}
          </div>
        </div>

        {progressError && isRealStudent && (
          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            Unable to load your latest progress right now.
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-950/75 p-4">
            <BookOpen size={22} className="text-cyan-300" />
            <h4 className="mt-5 text-2xl font-black text-white">
              {stats.coursesCount}
            </h4>
            <p className="text-sm text-slate-400">
              {isRealStudent ? "My Courses" : "Courses"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950/75 p-4">
            <Video size={22} className="text-purple-300" />
            <h4 className="mt-5 text-2xl font-black text-white">
              {stats.lessonsCount}
            </h4>
            <p className="text-sm text-slate-400">Lessons</p>
          </div>

          <div className="rounded-2xl bg-slate-950/75 p-4">
            <Clock size={22} className="text-yellow-300" />
            <h4 className="mt-5 text-2xl font-black text-white">
              {formatLearningTime(totalMinutes || stats.totalMinutes)}
            </h4>
            <p className="text-sm text-slate-400">Time</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-950/75 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <PlayCircle size={31} />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-1 font-black text-white">
                {hasCourse
                  ? `Resume: ${previewTitle}`
                  : "Explore a course to start learning"}
              </h4>

              <p className="mt-1 text-sm text-slate-400">
                {isRealStudent
                  ? `${completedLessons}/${totalLessons} lessons completed`
                  : "Enroll to track real progress"}
              </p>
            </div>

            <Link
              to={
                isRealStudent && hasCourse ? "/student/dashboard" : "/courses"
              }
              className="hidden rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-950 hover:bg-slate-200 sm:inline-flex"
            >
              {isRealStudent && hasCourse ? "Open" : "View"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const isStudent = isAuthenticated && user?.role === "student";

  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);

      const response = await api.get("/courses");

      const loadedCourses =
        response.data?.courses || response.data?.data || response.data || [];

      setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
    } catch (error) {
      console.warn("HOME_COURSES_FETCH_SKIPPED:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudentProgress = async () => {
    if (!isStudent) {
      setEnrolledCourses([]);
      setProgressError("");
      return;
    }

    try {
      setLoadingProgress(true);
      setProgressError("");

      const response = await api.get("/enrollments/my");

      const loadedEnrollments =
        response.data?.courses ||
        response.data?.enrollments ||
        response.data?.data ||
        [];

      setEnrolledCourses(
        Array.isArray(loadedEnrollments)
          ? loadedEnrollments.filter((item) => item?.course)
          : [],
      );
    } catch (error) {
      console.error("HOME_STUDENT_PROGRESS_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
      });

      setEnrolledCourses([]);
      setProgressError("Unable to load student progress.");
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudentProgress();
  }, [isStudent]);

  const featuredCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => getCourseEnrollments(b) - getCourseEnrollments(a))
      .slice(0, 3);
  }, [courses]);

  const publicStats = useMemo(() => {
    const coursesCount = courses.length || 0;

    const lessonsCount = courses.reduce(
      (total, course) => total + getCourseLessonsCount(course),
      0,
    );

    const totalMinutes = courses.reduce(
      (total, course) => total + getCourseTotalMinutes(course),
      0,
    );

    return {
      coursesCount,
      lessonsCount,
      totalMinutes,
    };
  }, [courses]);

  const studentStats = useMemo(() => {
    const coursesCount = enrolledCourses.length;

    const lessonsCount = enrolledCourses.reduce((total, item) => {
      return total + getEnrollmentProgress(item).totalLessons;
    }, 0);

    const totalMinutes = enrolledCourses.reduce((total, item) => {
      return total + getCourseTotalMinutes(item?.course);
    }, 0);

    return {
      coursesCount,
      lessonsCount,
      totalMinutes,
    };
  }, [enrolledCourses]);

  const currentEnrollment = enrolledCourses[0];

  const previewCourse = isStudent
    ? currentEnrollment?.course
    : featuredCourses[0] || courses[0];

  const previewProgress = isStudent
    ? getEnrollmentProgress(currentEnrollment)
    : {
        totalLessons: getCourseLessonsCount(previewCourse),
        completedLessons: 0,
        progressPercentage: 0,
      };

  const heroStats = isStudent ? studentStats : publicStats;

  const startLearningPath =
    isStudent && enrolledCourses.length > 0 ? "/student/dashboard" : "/courses";

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,1))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-blue-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <Sparkles size={18} className="text-blue-300" />
              {isStudent
                ? "Your personal learning overview"
                : "Production-like LMS for modern learners"}
            </div>

            <h1 className="max-w-4xl break-words text-5xl font-black leading-[1.05] md:text-7xl">
              Learn skills.
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Track progress.
              </span>
              Grow faster.
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl md:leading-9">
              {isStudent
                ? "Your homepage shows your real enrolled courses, completed lessons, and learning progress from your student dashboard."
                : "Discover structured web development courses, preview lessons, enroll securely, take lesson notes, complete progress, and earn certificates from one professional learning platform."}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-7 py-4 font-black text-white shadow-2xl shadow-blue-950/40 hover:opacity-95"
              >
                Explore Courses
                <ArrowRight size={18} />
              </Link>

              <Link
                to={startLearningPath}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-7 py-4 font-black text-white hover:bg-white/15"
              >
                {isStudent && enrolledCourses.length > 0
                  ? "Open Dashboard"
                  : "Start Learning"}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <StatBox
                value={heroStats.coursesCount}
                label={isStudent ? "My Courses" : "Courses"}
              />

              <StatBox value={heroStats.lessonsCount} label="Lessons" />

              <StatBox
                value={formatLearningTime(heroStats.totalMinutes)}
                label="Learning Time"
              />
            </div>
          </div>

          <div className="min-w-0">
            {loadingProgress && isStudent ? (
              <div className="flex min-h-[540px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.05]">
                <Loader2 size={40} className="animate-spin text-blue-400" />
                <p className="mt-4 text-slate-400">Loading your progress...</p>
              </div>
            ) : (
              <DashboardPreview
                course={previewCourse}
                stats={heroStats}
                progress={previewProgress}
                isRealStudent={isStudent}
                progressError={progressError}
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200">
              <ShieldCheck size={16} />
              Why VeoLMS
            </div>

            <h2 className="text-3xl font-black md:text-4xl">
              Built like a real learning product
            </h2>

            <p className="mt-3 max-w-3xl text-slate-400">
              VeoLMS is designed with protected videos, progress tracking,
              notes, reviews, certificates, and admin analytics.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <FeatureCard
            icon={Lock}
            title="Protected Videos"
            description="Course videos are served as private assets instead of exposing public video files."
            tone="green"
          />

          <FeatureCard
            icon={TrendingUp}
            title="Progress Tracking"
            description="Students can continue learning from where they stopped and track completion lesson by lesson."
            tone="blue"
          />

          <FeatureCard
            icon={FileText}
            title="Lesson Notes"
            description="Students can save notes while learning and keep understanding organized for revision."
            tone="cyan"
          />

          <FeatureCard
            icon={Award}
            title="Certificates"
            description="After completing courses, students can receive certificates that prove learning progress."
            tone="yellow"
          />

          <FeatureCard
            icon={Star}
            title="Reviews & Ratings"
            description="Students can share feedback and help future learners understand course quality."
            tone="purple"
          />

          <FeatureCard
            icon={BarChart3}
            title="Admin Analytics"
            description="Admins can track courses, students, enrollments, revenue, reviews, and video storage."
            tone="rose"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-200">
              <BookOpen size={16} />
              Featured Courses
            </div>

            <h2 className="text-3xl font-black md:text-4xl">
              Start with available courses
            </h2>

            <p className="mt-3 max-w-3xl text-slate-400">
              Preview courses, check lessons, enroll securely, and continue from
              your student dashboard.
            </p>
          </div>

          <Link
            to="/courses"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-200 hover:bg-white/10"
          >
            View All Courses
            <ArrowRight size={17} />
          </Link>
        </div>

        {loadingCourses ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
            <Loader2 size={40} className="animate-spin text-blue-400" />

            <p className="mt-4 font-semibold text-slate-400">
              Loading featured courses...
            </p>
          </div>
        ) : featuredCourses.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-300">
              <BookOpen size={31} />
            </div>

            <h3 className="mt-5 text-2xl font-black text-white">
              Courses will appear here
            </h3>

            <p className="mt-2 text-slate-400">
              Once admin publishes courses, students can explore them from this
              section.
            </p>

            <Link
              to="/courses"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
            >
              Open Courses
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredCourses.map((course) => (
              <CourseCard
                key={course?._id || course?.slug || course?.title}
                course={course}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 md:p-8">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-200">
              <Layers size={16} />
              Simple Learning Flow
            </div>

            <h2 className="text-3xl font-black md:text-4xl">
              How learning works
            </h2>

            <p className="mt-3 max-w-3xl text-slate-400">
              The journey is simple for students and professional for admins.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <StepCard
              number="01"
              icon={BookOpen}
              title="Choose a course"
              description="Browse available courses, check lessons, and preview course details before enrolling."
            />

            <StepCard
              number="02"
              icon={ShieldCheck}
              title="Enroll securely"
              description="Enroll through a protected payment flow and get access to private course videos."
            />

            <StepCard
              number="03"
              icon={Award}
              title="Complete and grow"
              description="Watch lessons, save notes, track progress, submit reviews, and earn certificates."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-8">
        <div className="relative overflow-hidden rounded-[2.3rem] border border-white/10 bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 p-8 shadow-2xl shadow-blue-950/40 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%)]" />

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-black text-white md:text-4xl">
                Ready to start learning?
              </h2>

              <p className="mt-3 max-w-3xl text-white/85">
                Explore courses, enroll securely, and continue your learning
                journey from the student dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 hover:bg-slate-200"
              >
                Explore Courses
                <ArrowRight size={18} />
              </Link>

              <Link
                to={startLearningPath}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-black text-white hover:bg-white/15"
              >
                {isStudent && enrolledCourses.length > 0
                  ? "Dashboard"
                  : "Start Learning"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
