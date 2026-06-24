import { useEffect, useState } from "react";
import { BookOpen, IndianRupee, ShoppingCart, Users } from "lucide-react";
import { api } from "../services/api";

const AdminStudentsPage = () => {
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalPaidPayments: 0,
    totalRevenue: 0,
  });

  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const overviewRes = await api.get("/admin/overview");
      const studentsRes = await api.get("/admin/students");
      const enrollmentsRes = await api.get("/admin/enrollments");

      console.log("Overview API:", overviewRes.data);
      console.log("Students API:", studentsRes.data);
      console.log("Enrollments API:", enrollmentsRes.data);

      setOverview(overviewRes.data?.overview || {});
      setStudents(
        Array.isArray(studentsRes.data?.students)
          ? studentsRes.data.students
          : [],
      );
      setEnrollments(
        Array.isArray(enrollmentsRes.data?.enrollments)
          ? enrollmentsRes.data.enrollments
          : [],
      );
    } catch (error) {
      console.error("Admin students page error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch admin data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="mb-10">
        <p className="text-blue-400 font-bold mb-3">Students & Enrollments</p>

        <h1 className="text-4xl md:text-5xl font-black">
          Admin User Management
        </h1>

        <p className="text-slate-400 mt-3">
          Track students, enrollments, payments, and course purchases.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading admin data...</p>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-10">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-300 flex items-center justify-center mb-5">
                <Users />
              </div>

              <p className="text-slate-400">Students</p>
              <h2 className="text-4xl font-black mt-2">
                {overview.totalStudents || 0}
              </h2>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-300 flex items-center justify-center mb-5">
                <BookOpen />
              </div>

              <p className="text-slate-400">Courses</p>
              <h2 className="text-4xl font-black mt-2">
                {overview.totalCourses || 0}
              </h2>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-300 flex items-center justify-center mb-5">
                <ShoppingCart />
              </div>

              <p className="text-slate-400">Enrollments</p>
              <h2 className="text-4xl font-black mt-2">
                {overview.totalEnrollments || 0}
              </h2>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 text-yellow-300 flex items-center justify-center mb-5">
                <IndianRupee />
              </div>

              <p className="text-slate-400">Revenue</p>
              <h2 className="text-4xl font-black mt-2">
                ₹{overview.totalRevenue || 0}
              </h2>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden mb-10">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Students</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {students.length} students found
                </p>
              </div>

              <button
                onClick={fetchAdminData}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15"
              >
                Refresh
              </button>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-slate-400">No students found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/70 text-slate-400 text-sm">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Courses</th>
                      <th className="px-6 py-4">Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student._id}
                        className="border-t border-white/10 hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-5 font-bold text-white">
                          {student.name}
                        </td>

                        <td className="px-6 py-5 text-slate-300">
                          {student.email}
                        </td>

                        <td className="px-6 py-5">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold border border-blue-500/20">
                            {student.enrolledCourses || 0}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-slate-400">
                          {student.joinedAt
                            ? new Date(student.joinedAt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-black">Recent Enrollments</h2>
              <p className="text-slate-400 text-sm mt-1">
                {enrollments.length} enrollments found
              </p>
            </div>

            {enrollments.length === 0 ? (
              <div className="p-8 text-slate-400">No enrollments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/70 text-slate-400 text-sm">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr
                        key={enrollment._id}
                        className="border-t border-white/10 hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-5">
                          <p className="font-bold text-white">
                            {enrollment.userId?.name || "Deleted user"}
                          </p>
                          <p className="text-sm text-slate-400">
                            {enrollment.userId?.email || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-white">
                            {enrollment.courseId?.title || "Deleted course"}
                          </p>
                          <p className="text-sm text-slate-400">
                            {enrollment.courseId?.category || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-5 font-bold">
                          ₹{(enrollment.paymentId?.amount || 0) / 100}
                        </td>

                        <td className="px-6 py-5">
                          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-300 text-xs font-bold border border-green-500/20">
                            {enrollment.paymentId?.status || "paid"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-slate-400">
                          {enrollment.createdAt
                            ? new Date(
                                enrollment.createdAt,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStudentsPage;
