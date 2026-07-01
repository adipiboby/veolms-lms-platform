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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-300 md:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 font-bold text-blue-700 dark:text-blue-400">
              Course Management
            </p>

            <h1 className="text-4xl font-black text-slate-950 md:text-5xl dark:text-white">
              Courses
            </h1>

            <p className="mt-3 text-slate-600 dark:text-slate-400">
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
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
          <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-white/10">
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                My Courses
              </h2>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {courses.length} courses found
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCourses}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-slate-600 dark:text-slate-400">
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-slate-600 dark:text-slate-400">
              No courses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-bold">Course</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Price</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {courses.map((course) => (
                    <tr
                      key={course._id}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-14 w-20 rounded-xl bg-slate-100 object-cover dark:bg-slate-900"
                          />

                          <div className="min-w-0">
                            <p className="line-clamp-1 font-bold text-slate-950 dark:text-white">
                              {course.title}
                            </p>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {course.instructorName ||
                                course.instructor ||
                                "VeoLMS Instructor"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-700 dark:text-slate-300">
                        {course.category || "Course"}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-950 dark:text-white">
                        ₹{course.price}
                      </td>

                      <td className="px-6 py-5">
                        {course.isPublished ? (
                          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/learn/${course.slug}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-green-500/20 dark:hover:text-green-300"
                            title="Open learning page"
                          >
                            <PlayCircle size={18} />
                          </Link>

                          <Link
                            to={`/admin/courses/${course._id}/edit`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
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
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
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
    </main>
  );
};

export default AdminCoursesPage;
