import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, PlayCircle, Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";

const AdminCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/courses/admin/all");

      setCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
    } catch (error) {
      console.error("Failed to fetch courses", error);

      setError(error.response?.data?.message || "Failed to fetch courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteCourse = async (courseId, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${courseTitle}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(courseId);
      setError("");

      await api.delete(`/courses/admin/${courseId}`);

      setCourses((prevCourses) =>
        prevCourses.filter((course) => course._id !== courseId),
      );
    } catch (error) {
      console.error("Failed to delete course", error);

      setError(error.response?.data?.message || "Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-3 font-bold text-blue-400">Course Management</p>

          <h1 className="text-4xl font-black md:text-5xl">Courses</h1>

          <p className="mt-3 text-slate-400">
            Create, update, publish, preview, and manage your LMS course
            content.
          </p>
        </div>

        <Link
          to="/admin/courses/create"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          New Course
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="text-2xl font-black">My Courses</h2>

            <p className="mt-1 text-sm text-slate-400">
              {courses.length} courses found
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCourses}
            className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/15"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-slate-400">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-slate-400">No courses found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/70 text-sm text-slate-400">
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
                          <p className="font-bold text-white">{course.title}</p>

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
                      {course.isPublished ? (
                        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                          Draft
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/learn/${course.slug}`}
                          className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-green-500/20 hover:text-green-300"
                          title="Open learning page"
                        >
                          <PlayCircle size={18} />
                        </Link>

                        <Link
                          to={`/admin/courses/${course._id}/edit`}
                          className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-blue-500/20 hover:text-blue-300"
                          title="Edit course"
                        >
                          <Edit size={18} />
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCourse(course._id, course.title)
                          }
                          disabled={deletingId === course._id}
                          className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                          title="Delete course"
                        >
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
  );
};

export default AdminCoursesPage;
