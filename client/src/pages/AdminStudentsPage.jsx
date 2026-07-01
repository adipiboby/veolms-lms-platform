import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Clock,
  GraduationCap,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";

import { api } from "../services/api";

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatNumber = (value = 0) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const StatCard = ({ title, value, icon: Icon, tone = "blue" }) => {
  const toneClasses = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    purple:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300",
    green:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300",
    yellow:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
      <div
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${
          toneClasses[tone] || toneClasses.blue
        }`}
      >
        <Icon size={26} />
      </div>

      <p className="text-slate-600 dark:text-slate-400">{title}</p>

      <h3 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
        {value}
      </h3>
    </div>
  );
};

const EmptyState = ({ message }) => {
  return (
    <div className="p-6 text-slate-600 dark:text-slate-400">{message}</div>
  );
};

const AdminStudentsPage = () => {
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    totalPaidPayments: 0,
  });

  const [students, setStudents] = useState([]);
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      return (
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      );
    });
  }, [students, searchTerm]);

  const fetchStudentsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const res = await api.get("/admin/students");

      setOverview(res.data.overview || {});
      setStudents(Array.isArray(res.data.students) ? res.data.students : []);
      setRecentEnrollments(
        Array.isArray(res.data.recentEnrollments)
          ? res.data.recentEnrollments
          : [],
      );
    } catch (error) {
      console.error("ADMIN_STUDENTS_FETCH_ERROR:", error);

      setError(
        error.response?.data?.message || "Failed to load student management",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <Loader2
            className="animate-spin text-blue-500 dark:text-blue-400"
            size={44}
          />

          <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
            Loading student management...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="font-bold text-blue-700 dark:text-blue-400">
            Students & Enrollments
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-950 md:text-5xl dark:text-white">
            Admin User Management
          </h1>

          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Track students, enrollments, payments, and course purchases.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle size={22} />
              <p className="font-bold">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => fetchStudentsData(true)}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Students"
            value={formatNumber(overview.totalStudents)}
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Courses"
            value={formatNumber(overview.totalCourses)}
            icon={BookOpen}
            tone="purple"
          />

          <StatCard
            title="Enrollments"
            value={formatNumber(overview.totalEnrollments)}
            icon={ShoppingCart}
            tone="green"
          />

          <StatCard
            title="Revenue"
            value={formatCurrency(overview.totalRevenue)}
            icon={IndianRupee}
            tone="yellow"
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between dark:border-white/10">
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Students
              </h2>

              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {formatNumber(filteredStudents.length)} students found
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                <Search
                  size={18}
                  className="text-slate-500 dark:text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student..."
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 sm:w-64 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchStudentsData(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState message="No students found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Enrollments
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Total Spent
                    </th>
                    <th className="px-6 py-4 font-semibold">Last Enrollment</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            <Users size={20} />
                          </div>

                          <div>
                            <p className="font-bold text-slate-950 dark:text-white">
                              {student.name || "Unnamed Student"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDateTime(student.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-black text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
                          {formatNumber(student.totalEnrollments)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(student.totalSpent)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.lastEnrollmentAt
                          ? formatDateTime(student.lastEnrollmentAt)
                          : "No enrollments"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <div className="border-b border-slate-200 p-6 dark:border-white/10">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Recent Enrollments
            </h2>

            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Latest course purchases and student enrollments.
            </p>
          </div>

          {recentEnrollments.length === 0 ? (
            <EmptyState message="No recent enrollments found." />
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {recentEnrollments.map((enrollment) => (
                <div
                  key={enrollment._id}
                  className="flex flex-col gap-4 p-6 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between dark:hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
                        <GraduationCap size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-slate-950 dark:text-white">
                          {enrollment.student?.name || "Student"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {enrollment.student?.email}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                      Enrolled in{" "}
                      <span className="font-bold text-blue-700 dark:text-blue-300">
                        {enrollment.course?.title || "Course"}
                      </span>
                    </p>
                  </div>

                  <div className="shrink-0 md:text-right">
                    <p className="font-black text-yellow-700 dark:text-yellow-300">
                      {formatCurrency(enrollment.course?.price)}
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 md:justify-end">
                      <Clock size={14} />
                      {formatDateTime(enrollment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default AdminStudentsPage;
