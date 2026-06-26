import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const getLessons = (course) => {
  if (!course?.sections || !Array.isArray(course.sections)) return [];

  return course.sections.flatMap((section) => {
    if (!Array.isArray(section.lessons)) return [];
    return section.lessons;
  });
};

const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;

  if (typeof duration === "number") return duration;

  const text = String(duration).trim().toLowerCase();

  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);

  if (hourMatch || minuteMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    return hours * 60 + minutes;
  }

  const parts = text.split(":").map(Number);

  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [hours, minutes, seconds] = parts;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    const [minutes, seconds] = parts;
    return minutes + Math.round(seconds / 60);
  }

  const numberOnly = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(numberOnly) ? numberOnly : 0;
};

const getCourseDurationMinutes = (course) => {
  return getLessons(course).reduce((total, lesson) => {
    return total + parseDurationToMinutes(lesson.duration);
  }, 0);
};

const formatDuration = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));

  if (safeMinutes === 0) return "0m";

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
};

const getProgressPercent = (progress, totalLessons) => {
  const directProgress =
    progress?.progressPercentage ??
    progress?.percentage ??
    progress?.progress?.progressPercentage ??
    progress?.courseProgress?.progressPercentage;

  if (Number.isFinite(Number(directProgress))) {
    return Math.min(100, Math.max(0, Math.round(Number(directProgress))));
  }

  const completedLessons =
    Number(progress?.completedLessons) ||
    Number(progress?.progress?.completedLessons) ||
    Number(progress?.courseProgress?.completedLessons) ||
    0;

  const actualTotalLessons =
    Number(progress?.totalLessons) ||
    Number(progress?.progress?.totalLessons) ||
    Number(progress?.courseProgress?.totalLessons) ||
    totalLessons ||
    0;

  if (!actualTotalLessons) return 0;

  return Math.min(
    100,
    Math.max(0, Math.round((completedLessons / actualTotalLessons) * 100))
  );
};

const getCompletedLessons = (progress) => {
  return (
    Number(progress?.completedLessons) ||
    Number(progress?.progress?.completedLessons) ||
    Number(progress?.courseProgress?.completedLessons) ||
    0
  );
};

const findResumeLesson = (course, progress) => {
  const lessons = getLessons(course);

  if (!lessons.length) return null;

  const currentLessonId =
    progress?.currentLessonId ||
    progress?.progress?.currentLessonId ||
    progress?.courseProgress?.currentLessonId ||
    progress?.lastWatchedLessonId;

  if (currentLessonId) {
    const foundLesson = lessons.find(
      (lesson) => String(lesson._id || lesson.id) === String(currentLessonId)
    );

    if (foundLesson) return foundLesson;
  }

  return lessons[0];
};

const HomePage = () => {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [mainProgress, setMainProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const mainCourse = courses[0] || null;
  const lessons = getLessons(mainCourse);
  const resumeLesson = findResumeLesson(mainCourse, mainProgress);

  const totalCourses = courses.length;

  const totalLessons = useMemo(() => {
    return courses.reduce((total, course) => total + getLessons(course).length, 0);
  }, [courses]);

  const totalDurationMinutes = useMemo(() => {
    return courses.reduce((total, course) => {
      return total + getCourseDurationMinutes(course);
    }, 0);
  }, [courses]);

  const mainCourseDuration = getCourseDurationMinutes(mainCourse);
  const progressPercent = getProgressPercent(mainProgress, lessons.length);
  const completedLessons = getCompletedLessons(mainProgress);

  const startLearningPath = user ? "/student/dashboard" : "/login";

  const playPath =
    user && mainCourse?.slug
      ? `/learn/${mainCourse.slug}`
      : user
        ? "/student/dashboard"
        : "/login";

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const coursesRes = await api.get("/courses");

        const courseList = Array.isArray(coursesRes.data?.courses)
          ? coursesRes.data.courses
          : [];

        setCourses(courseList);

        const firstCourse = courseList[0];

        if (user && firstCourse?._id) {
          try {
            const progressRes = await api.get(
              `/progress/course/${firstCourse._id}`
            );

            setMainProgress(
              progressRes.data?.progress ||
                progressRes.data?.courseProgress ||
                progressRes.data
            );
          } catch {
            setMainProgress(null);
          }
        } else {
          setMainProgress(null);
        }
      } catch (error) {
        console.error("HOME_DATA_FETCH_ERROR:", error);
        setCourses([]);
        setMainProgress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [user]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-purple-700/20 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="min-w-0">
            <div className="mb-8 inline-flex max-w-full items-center gap-3 rounded-full border border-slate-700 bg-white/5 px-5 py-3 text-sm font-semibold text-blue-100 shadow-lg shadow-blue-950/20">
              <span className="text-xl">✧</span>
              <span className="truncate">
                Production-like LMS for modern learners
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Learn skills.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Track progress.
              </span>
              <br />
              Grow faster.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Discover structured web development courses, preview lessons,
              enroll securely, and continue learning from where you stopped.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-1 hover:shadow-purple-900/30"
              >
                Explore Courses
                <span className="text-xl">→</span>
              </Link>

              <Link
                to={startLearningPath}
                className="inline-flex items-center rounded-2xl border border-slate-700 bg-white/10 px-7 py-4 text-base font-bold text-white transition hover:-translate-y-1 hover:bg-white/15"
              >
                Start Learning
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="min-w-0 rounded-2xl border border-slate-800 bg-white/5 p-4 sm:p-5">
                <p className="truncate text-2xl font-black sm:text-3xl">
                  {loading ? "..." : totalCourses}
                </p>
                <p className="mt-2 text-xs text-slate-400 sm:text-sm">
                  Courses
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-800 bg-white/5 p-4 sm:p-5">
                <p className="truncate text-2xl font-black sm:text-3xl">
                  {loading ? "..." : totalLessons}
                </p>
                <p className="mt-2 text-xs text-slate-400 sm:text-sm">
                  Lessons
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-800 bg-white/5 p-4 sm:p-5">
                <p className="truncate text-2xl font-black sm:text-3xl">
                  {loading ? "..." : formatDuration(totalDurationMinutes)}
                </p>
                <p className="mt-2 text-xs text-slate-400 sm:text-sm">
                  Time
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-700 bg-slate-900/80 shadow-2xl shadow-purple-950/30 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 border-b border-slate-700 px-5 py-4">
                <div className="flex shrink-0 gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>

                <p className="truncate text-sm text-slate-400">
                  Student Dashboard Preview
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-5 sm:p-6">
                  <p className="text-sm text-blue-100">Continue Learning</p>

                  <h2 className="mt-3 max-h-16 overflow-hidden text-xl font-black leading-8 sm:text-2xl">
                    {mainCourse?.title || "No course available"}
                  </h2>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-blue-100">
                    <span>{progressPercent}% completed</span>
                    <span>
                      {completedLessons}/{lessons.length} lessons
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="min-w-0 rounded-2xl bg-slate-950 p-4 sm:p-5">
                    <p className="text-xl">📘</p>
                    <p className="mt-4 truncate text-lg font-black sm:text-xl">
                      {totalCourses}
                    </p>
                    <p className="text-xs text-slate-400 sm:text-sm">Courses</p>
                  </div>

                  <div className="min-w-0 rounded-2xl bg-slate-950 p-4 sm:p-5">
                    <p className="text-xl">🎬</p>
                    <p className="mt-4 truncate text-lg font-black sm:text-xl">
                      {totalLessons}
                    </p>
                    <p className="text-xs text-slate-400 sm:text-sm">Lessons</p>
                  </div>

                  <div className="min-w-0 rounded-2xl bg-slate-950 p-4 sm:p-5">
                    <p className="text-xl">⏱️</p>
                    <p className="mt-4 truncate text-lg font-black sm:text-xl">
                      {formatDuration(totalDurationMinutes)}
                    </p>
                    <p className="text-xs text-slate-400 sm:text-sm">Time</p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl sm:h-16 sm:w-16">
                      ▶
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold">
                        {resumeLesson?.title
                          ? `Resume: ${resumeLesson.title}`
                          : "Start learning"}
                      </h3>

                      <p className="mt-1 truncate text-sm text-slate-400">
                        {mainCourse?.title || "Choose a course"}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {lessons.length} lessons •{" "}
                        {formatDuration(mainCourseDuration)}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={playPath}
                    className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-blue-100 sm:px-5"
                  >
                    Play
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;