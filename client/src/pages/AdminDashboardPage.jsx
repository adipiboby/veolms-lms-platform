import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CreditCard,
  IndianRupee,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import AdminLayout from "../components/admin/AdminLayout";

const AdminDashboardPage = () => {
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalPaidPayments: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/admin/overview");

      console.log("Admin overview:", res.data);

      setOverview(res.data?.overview || {});
    } catch (error) {
      console.error("Failed to fetch admin overview", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <AdminLayout>
      <div className="px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <p className="text-blue-400 font-bold mb-3">Admin Overview</p>

            <h1 className="text-5xl md:text-6xl font-black text-white">
              Dashboard
            </h1>

            <p className="text-slate-400 mt-4 text-lg max-w-3xl">
              Manage courses, students, enrollments, payments, and platform
              content from one place.
            </p>
          </div>

          <Link
            to="/admin/courses/create"
            className="inline-flex items-center justify-center px-8 py-5 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg shadow-lg shadow-blue-600/20"
          >
            Create Course
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading dashboard data...</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-300 flex items-center justify-center mb-8">
                  <BookOpen size={28} />
                </div>

                <h2 className="text-4xl font-black">
                  {overview.totalCourses || 0}
                </h2>

                <p className="text-slate-400 mt-3 text-lg">Total Courses</p>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                <div className="h-14 w-14 rounded-2xl bg-green-500/10 text-green-300 flex items-center justify-center mb-8">
                  <Users size={28} />
                </div>

                <h2 className="text-4xl font-black">
                  {overview.totalStudents || 0}
                </h2>

                <p className="text-slate-400 mt-3 text-lg">Students</p>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-300 flex items-center justify-center mb-8">
                  <CreditCard size={28} />
                </div>

                <h2 className="text-4xl font-black">
                  {overview.totalEnrollments || 0}
                </h2>

                <p className="text-slate-400 mt-3 text-lg">Enrollments</p>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 text-yellow-300 flex items-center justify-center mb-8">
                  <IndianRupee size={28} />
                </div>

                <h2 className="text-4xl font-black">
                  ₹{overview.totalRevenue || 0}
                </h2>

                <p className="text-slate-400 mt-3 text-lg">Test Revenue</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-8 mb-10">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black">Platform Activity</h2>
                  <p className="text-slate-400 mt-2">
                    Course and enrollment growth preview.
                  </p>
                </div>

                <TrendingUp className="text-blue-400" size={32} />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <div className="rounded-2xl bg-slate-950 border border-white/10 p-5">
                  <p className="text-slate-400">Paid Payments</p>
                  <h3 className="text-3xl font-black mt-2">
                    {overview.totalPaidPayments || 0}
                  </h3>
                </div>

                <div className="rounded-2xl bg-slate-950 border border-white/10 p-5">
                  <p className="text-slate-400">Total Enrollments</p>
                  <h3 className="text-3xl font-black mt-2">
                    {overview.totalEnrollments || 0}
                  </h3>
                </div>

                <div className="rounded-2xl bg-slate-950 border border-white/10 p-5">
                  <p className="text-slate-400">Revenue</p>
                  <h3 className="text-3xl font-black mt-2">
                    ₹{overview.totalRevenue || 0}
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Link
                to="/admin/courses"
                className="rounded-3xl bg-white/5 border border-white/10 p-6 hover:border-blue-500/40"
              >
                <h3 className="text-xl font-black mb-2">Manage Courses</h3>
                <p className="text-slate-400">
                  Create, edit, delete, and publish LMS courses.
                </p>
              </Link>

              <Link
                to="/admin/students"
                className="rounded-3xl bg-white/5 border border-white/10 p-6 hover:border-blue-500/40"
              >
                <h3 className="text-xl font-black mb-2">
                  Students & Enrollments
                </h3>
                <p className="text-slate-400">
                  View students, purchases, payments, and revenue.
                </p>
              </Link>

              <button
                onClick={fetchOverview}
                className="text-left rounded-3xl bg-white/5 border border-white/10 p-6 hover:border-blue-500/40"
              >
                <h3 className="text-xl font-black mb-2">Refresh Dashboard</h3>
                <p className="text-slate-400">
                  Fetch latest admin overview data from backend.
                </p>
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
