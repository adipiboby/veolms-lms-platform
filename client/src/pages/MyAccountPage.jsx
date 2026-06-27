import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Loader2,
  Mail,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const getProfileImage = (user) => {
  return (
    user?.avatar ||
    user?.photo ||
    user?.profilePhoto ||
    user?.profileImage ||
    user?.picture ||
    ""
  );
};

const getUserName = (user) => {
  return user?.name || user?.email?.split("@")[0] || "User";
};

const getInitial = (name = "") => {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

const formatDate = (date) => {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const MyAccountPage = () => {
  const { user } = useAuth();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profileImage = getProfileImage(user);
  const userName = getUserName(user);

  const isStudent = user?.role === "student";

  const stats = useMemo(() => {
    const totalCourses = enrolledCourses.length;

    const totalProgress = enrolledCourses.reduce((sum, item) => {
      return sum + Number(item?.progress?.progressPercentage || 0);
    }, 0);

    const averageProgress =
      totalCourses === 0 ? 0 : Math.round(totalProgress / totalCourses);

    return {
      totalCourses,
      averageProgress,
    };
  }, [enrolledCourses]);

  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!isStudent) return;

      try {
        setLoading(true);
        setError("");

        const { data } = await api.get("/enrollments/my");

        setEnrolledCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (error) {
        console.error("MY_ACCOUNT_COURSES_ERROR:", error);

        setError(
          error?.response?.data?.message ||
            "Unable to load your enrolled courses.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, [isStudent]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">My Account</h1>

        <p className="mt-2 text-sm text-slate-400">
          View your profile and learning details.
        </p>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={userName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                  {getInitial(userName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black">{userName}</h2>

              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <Mail size={16} />
                  {user?.email}
                </span>

                <span className="inline-flex items-center gap-2 capitalize">
                  <ShieldCheck size={16} />
                  {user?.role}
                </span>

                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  Joined {formatDate(user?.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {isStudent ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Total enrolled courses</p>
                <p className="mt-2 text-3xl font-black">{stats.totalCourses}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Average progress</p>
                <p className="mt-2 text-3xl font-black">
                  {stats.averageProgress}%
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-300" />
                <h2 className="text-xl font-black">Enrolled Courses</h2>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-950/60 p-5 text-slate-300">
                  <Loader2 size={20} className="animate-spin text-blue-400" />
                  Loading courses...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {error}
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-400">
                  You have not enrolled in any course yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledCourses.map((item) => {
                    const course = item?.course;
                    const progress = Number(
                      item?.progress?.progressPercentage || 0,
                    );

                    return (
                      <article
                        key={item?.enrollmentId || course?._id}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-black text-white">
                              {course?.title || "Course"}
                            </h3>

                            <p className="mt-1 text-sm text-slate-400">
                              Enrolled on {formatDate(item?.enrolledAt)}
                            </p>

                            {course?.instructorName && (
                              <p className="mt-1 text-xs text-slate-500">
                                Instructor: {course.instructorName}
                              </p>
                            )}
                          </div>

                          <div className="w-full sm:w-64">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-slate-400">Progress</span>
                              <span className="font-black text-blue-300">
                                {progress}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2">
              <UserCircle size={20} className="text-blue-300" />
              <h2 className="text-xl font-black">Admin Account</h2>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              You are logged in as admin. Course creation, videos, lessons, and
              student activity can be managed from the admin dashboard.
            </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default MyAccountPage;
