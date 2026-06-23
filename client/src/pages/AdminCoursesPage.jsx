import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import AdminLayout from "../components/admin/AdminLayout";

const AdminCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses");
      setCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
    } catch (error) {
      console.error("Failed to fetch courses", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <AdminLayout>
      <div className="px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <p className="text-blue-400 font-bold mb-3">Course Management</p>

            <h1 className="text-4xl md:text-5xl font-black">Courses</h1>

            <p className="text-slate-400 mt-3">
              Create, update, publish, and manage LMS course content.
            </p>
          </div>

          <Link
            to="/admin/courses/create"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            New Course
          </Link>
        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-black">All Courses</h2>
          </div>

          {loading ? (
            <div className="p-8 text-slate-400">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-slate-400">No courses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/70 text-slate-400 text-sm">
                  <tr>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course._id}
                      className="border-t border-white/10 hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-14 w-20 rounded-xl object-cover"
                          />

                          <div>
                            <p className="font-bold text-white">
                              {course.title}
                            </p>
                            <p className="text-sm text-slate-400">
                              {course.instructorName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {course.category}
                      </td>

                      <td className="px-6 py-5 font-bold">₹{course.price}</td>

                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-300 text-xs font-bold border border-green-500/20">
                          Published
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300">
                            <Edit size={18} />
                          </button>

                          <button className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCoursesPage;
