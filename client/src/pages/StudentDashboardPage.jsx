import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const getArrayFromResponse = (data, possibleKeys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.enrollments)) return data.data.enrollments;
  if (Array.isArray(data?.data?.courses)) return data.data.courses;
  if (Array.isArray(data?.enrolledCourses)) return data.enrolledCourses;

  return [];
};

const getCourseFromEnrollment = (enrollment) => {
  return (
    enrollment?.course ||
    enrollment?.courseId ||
    enrollment?.courseDetails ||
    enrollment?.enrolledCourse ||
    enrollment
  );
};

const getCourseId = (enrollment) => {
  const course = getCourseFromEnrollment(enrollment);

  if (course && typeof course === "object") {
    return course._id || course.id || "";
  }

  return enrollment?.courseId || enrollment?.course || "";
};

const getLessons = (course) => {
  if (!course?.sections || !Array.isArray(course.sections)) return [];

  return course.sections.flatMap((section) => {
    if (!Array.isArray(section.lessons)) return [];
    return section.lessons;
  });
};

const getTotalLessons = (enrollment, course, progress) => {
  const fromProgress =
    Number(progress?.totalLessons) ||
    Number(progress?.progress?.totalLessons) ||
    Number(progress?.courseProgress?.totalLessons);

  const fromEnrollment =
    Number(enrollment?.totalLessons) ||
    Number(enrollment?.progress?.totalLessons) ||
    Number(enrollment?.courseProgress?.totalLessons);

  const fromCourse = getLessons(course).length;

  return fromProgress || fromEnrollment || fromCourse || 0;
};

const getCompletedLessons = (enrollment, progress, totalLessons) => {
  const fromProgress =
    Number(progress?.completedLessons) ||
    Number(progress?.progress?.completedLessons) ||
    Number(progress?.courseProgress?.completedLessons);

  const fromEnrollment =
    Number(enrollment?.completedLessons) ||
    Number(enrollment?.progress?.completedLessons) ||
    Number(enrollment?.courseProgress?.completedLessons);

  const completed = fromProgress || fromEnrollment || 0;

  return Math.min(completed, totalLessons);
};

const getProgressPercentage = ({ enrollment, course, progress }) => {
  const totalLessons = getTotalLessons(enrollment, course, progress);
  const completedLessons = getCompletedLessons(
    enrollment,
    progress,
    totalLessons,
  );

  const directProgress =
    progress?.progressPercentage ??
    progress?.percentage ??
    progress?.progress?.progressPercentage ??
    progress?.courseProgress?.progressPercentage ??
    enrollment?.progressPercentage ??
    enrollment?.progress?.progressPercentage ??
    enrollment?.courseProgress?.progressPercentage;

  if (Number.isFinite(Number(directProgress))) {
    return Math.min(100, Math.max(0, Math.round(Number(directProgress))));
  }

  if (!totalLessons) return 0;

  return Math.min(
    100,
    Math.max(0, Math.round((completedLessons / totalLessons) * 100)),
  );
};

const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;

  if (typeof duration === "number") {
    return Number.isFinite(duration) ? duration : 0;
  }

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

  const onlyNumber = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(onlyNumber) ? onlyNumber : 0;
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
      (lesson) => String(lesson._id || lesson.id) === String(currentLessonId),
    );

    if (foundLesson) return foundLesson;
  }

  return lessons[0];
};

const StudentDashboardPage = () => {
  const { user } = useAuth();

  const [enrollments, setEnrollments] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const enrollmentRes = await api.get("/enrollments/my");

      const enrollmentList = getArrayFromResponse(enrollmentRes.data, [
        "enrollments",
        "myCourses",
        "courses",
        "items",
      ]);

      setEnrollments(enrollmentList);

      const progressResults = await Promise.all(
        enrollmentList.map(async (enrollment) => {
          try {
            const courseId = getCourseId(enrollment);

            if (!courseId) return null;

            const progressRes = await api.get(`/progress/course/${courseId}`);

            return {
              courseId: String(courseId),
              progress:
                progressRes.data?.progress ||
                progressRes.data?.courseProgress ||
                progressRes.data,
            };
          } catch {
            return null;
          }
        }),
      );

      const nextProgressMap = {};

      progressResults.forEach((item) => {
        if (item?.courseId) {
          nextProgressMap[item.courseId] = item.progress;
        }
      });

      setProgressMap(nextProgressMap);

      try {
        const certificateRes = await api.get("/certificates/my");

        const certificateList = getArrayFromResponse(certificateRes.data, [
          "certificates",
          "items",
        ]);

        setCertificates(certificateList);
      } catch {
        setCertificates([]);
      }
    } catch (error) {
      console.error("STUDENT_DASHBOARD_FETCH_ERROR:", error);
      setEnrollments([]);
      setProgressMap({});
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const dashboardStats = useMemo(() => {
    let totalLessons = 0;
    let completedLessons = 0;

    enrollments.forEach((enrollment) => {
      const course = getCourseFromEnrollment(enrollment);
      const courseId = getCourseId(enrollment);
      const progress = progressMap[String(courseId)];

      const courseTotalLessons = getTotalLessons(enrollment, course, progress);

      const courseCompletedLessons = getCompletedLessons(
        enrollment,
        progress,
        courseTotalLessons,
      );

      totalLessons += courseTotalLessons;
      completedLessons += courseCompletedLessons;
    });

    const overallProgress = totalLessons
      ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
      : 0;

    return {
      totalCourses: enrollments.length,
      totalLessons,
      completedLessons,
      overallProgress,
      certificatesCount: certificates.length,
    };
  }, [enrollments, progressMap, certificates]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20">
            <p className="text-slate-600 dark:text-slate-300">
              Loading student dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-5 py-10 text-slate-950 transition-colors duration-300 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-6 shadow-2xl shadow-slate-200/70 sm:p-8 dark:border-white/10 dark:from-slate-900 dark:to-slate-950 dark:shadow-blue-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700 dark:text-blue-300">
                Student Dashboard
              </p>

              <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
                Welcome back{user?.name ? `, ${user.name}` : ""} 👋
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
                Continue your enrolled courses, track your lesson progress, and
                download certificates after completion.
              </p>
            </div>

            <Link
              to="/courses"
              className="inline-flex w-fit items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white transition hover:-translate-y-1"
            >
              Browse Courses →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-950 dark:text-white">
                {dashboardStats.totalCourses}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Enrolled Courses
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-950 dark:text-white">
                {dashboardStats.completedLessons}/{dashboardStats.totalLessons}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Lessons Completed
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-950 dark:text-white">
                {dashboardStats.overallProgress}%
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Overall Progress
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-3xl font-black text-slate-950 dark:text-white">
                {dashboardStats.certificatesCount}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Certificates
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                My Courses
              </h2>

              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Continue learning from where you stopped.
              </p>
            </div>
          </div>

          {enrollments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-950/70">
              <h3 className="text-xl font-black text-slate-950 dark:text-white">
                No enrolled courses yet
              </h3>

              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Explore courses and enroll to start learning.
              </p>

              <Link
                to="/courses"
                className="mt-6 inline-flex rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
              >
                Explore Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {enrollments.map((enrollment) => {
                const course = getCourseFromEnrollment(enrollment);
                const courseId = getCourseId(enrollment);
                const progress = progressMap[String(courseId)];

                const totalLessons = getTotalLessons(
                  enrollment,
                  course,
                  progress,
                );

                const completedLessons = getCompletedLessons(
                  enrollment,
                  progress,
                  totalLessons,
                );

                const progressPercentage = getProgressPercentage({
                  enrollment,
                  course,
                  progress,
                });

                const durationMinutes = getCourseDurationMinutes(course);
                const resumeLesson = findResumeLesson(course, progress);

                const continuePath = course?.slug
                  ? `/learn/${course.slug}`
                  : "/student/dashboard";

                return (
                  <article
                    key={String(courseId || enrollment._id)}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:shadow-slate-950/40"
                  >
                    <div className="h-48 overflow-hidden bg-slate-100 dark:bg-slate-900">
                      {course?.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div className="space-y-5 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-bold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                          {course?.category || "Course"}
                        </span>

                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {course?.level || "Beginner"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                          {course?.title || "Untitled Course"}
                        </h3>

                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                          {course?.shortDescription ||
                            "Continue learning this course."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>🎬 {totalLessons} lessons</span>
                        <span>⏱️ {formatDuration(durationMinutes)}</span>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="text-slate-700 dark:text-slate-300">
                            Progress
                          </span>

                          <span className="font-black text-cyan-700 dark:text-cyan-300">
                            {progressPercentage}%
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>

                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                          {completedLessons} of {totalLessons} lessons completed
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Resume Lesson
                        </p>

                        <p className="mt-2 truncate font-bold text-slate-800 dark:text-slate-200">
                          {resumeLesson?.title || "Start from first lesson"}
                        </p>
                      </div>

                      <Link
                        to={continuePath}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 font-black text-white transition hover:-translate-y-1"
                      >
                        Continue Learning
                        <span>▷</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-2xl dark:bg-yellow-400/10">
              🏅
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                My Certificates
              </h2>

              <p className="mt-1 text-slate-600 dark:text-slate-400">
                View and download your completed course certificates.
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
              No certificates generated yet. Complete a course to unlock your
              certificate.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((certificate) => (
                <div
                  key={certificate._id || certificate.certificateId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950"
                >
                  <h3 className="font-black text-slate-950 dark:text-white">
                    {certificate.courseTitle ||
                      certificate.course?.title ||
                      "Course Certificate"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Certificate ID: {certificate.certificateId}
                  </p>

                  <Link
                    to={`/certificates/${certificate.certificateId}`}
                    className="mt-4 inline-flex rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-yellow-300"
                  >
                    View Certificate
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default StudentDashboardPage;
