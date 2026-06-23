import { useEffect, useState } from "react";
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
  const [coursesCount, setCoursesCount] = useState(0);

  useEffect(() => {
    const fetchCoursesCount = async () => {
      try {
        const res = await api.get("/courses");
        setCoursesCount(res.data?.count || 0);
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
      }
    };

    fetchCoursesCount();
  }, []);

  return (
    <AdminLayout>
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 h-96 w-96 bg-purple-600/20 rounded-full blur-3xl" />

        <div className="relative px-4 md:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <p className="text-blue-400 font-bold mb-3">Admin Overview</p>

              <h1 className="text-4xl md:text-5xl font-black">
                Dashboard
              </h1>

              <p className="text-slate-400 mt-3 max-w-2xl">
                Manage courses, students, enrollments, payments, and platform
                content from one place.
              </p>
            </div>

            <button className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-600/20">
              Create Course
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5">
                <BookOpen className="text-blue-300" size={24} />
              </div>

              <h2 className="text-3xl font-black">{coursesCount}</h2>
              <p className="text-slate-400 mt-1">Total Courses</p>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-5">
                <Users className="text-green-300" size={24} />
              </div>

              <h2 className="text-3xl font-black">0</h2>
              <p className="text-slate-400 mt-1">Students</p>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-5">
                <CreditCard className="text-purple-300" size={24} />
              </div>

              <h2 className="text-3xl font-black">0</h2>
              <p className="text-slate-400 mt-1">Enrollments</p>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-5">
                <IndianRupee className="text-yellow-300" size={24} />
              </div>

              <h2 className="text-3xl font-black">₹0</h2>
              <p className="text-slate-400 mt-1">Test Revenue</p>
            </div>
          </div>

          <div className="grid xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black">Platform Activity</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Course and enrollment growth preview.
                  </p>
                </div>

                <TrendingUp className="text-blue-400" size={28} />
              </div>

              <div className="h-64 rounded-2xl bg-slate-950/70 border border-white/10 flex items-end gap-4 p-6">
                {[40, 65, 50, 80, 60, 90, 75].map((height, index) => (
                  <div key={index} className="flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 to-purple-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <h2 className="text-2xl font-black mb-6">Next Actions</h2>

              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-4">
                  <p className="font-bold">Course CRUD</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Create, edit, and delete courses.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-4">
                  <p className="font-bold">Payment Flow</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Razorpay test payment and enrollment.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-4">
                  <p className="font-bold">Student Learning</p>
                  <p className="text-sm text-slate-400 mt-1">
                    My courses, progress, and resume playback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;