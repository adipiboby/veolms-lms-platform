import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, PlayCircle, TrendingUp } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const StudentDashboardPage = () => {
  const { user } = useAuth();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/enrollments/my-courses");
      setEnrolledCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
    } catch (error) {
      console.error("Failed to fetch my courses", error);
      setError(error.response?.data?.message || "Failed to fetch your courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const totalCourses = enrolledCourses.length;

  const totalLessons = enrolledCourses.reduce((total, item) => {
    const sections = item.course?.sections || [];

    const lessonCount = sections.reduce((sectionTotal, section) => {
      return sectionTotal + (section.lessons?.length || 0);
    }, 0);

    return total + lessonCount;
  }, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white pt-28 pb-16">
      <section className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-10">
          <p className="text-blue-400 font-bold mb-3">Student Dashboard</p>

          <h1 className="text-4xl md:text-5xl font-black">
            Welcome back, {user?.name}
          </h1>

          <p className="text-slate-400 mt-3">
            Continue your enrolled courses and track your learning journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-300 flex items-center justify-center mb-5">
              <BookOpen />
            </div>

            <p className="text-slate-400">My Courses</p>
            <h2 className="text-4xl font-black mt-2">{totalCourses}</h2>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-300 flex items-center justify-center mb-5">
              <PlayCircle />
            </div>

            <p className="text-slate-400">Total Lessons</p>
            <h2 className="text-4xl font-black mt-2">{totalLessons}</h2>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-300 flex items-center justify-center mb-5">
              <TrendingUp />
            </div>

            <p className="text-slate-400">Progress</p>
            <h2 className="text-4xl font-black mt-2">0%</h2>
            <p className="text-xs text-slate-500 mt-2">
              Progress tracking coming next
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black">My Learning</h2>
              <p className="text-slate-400 text-sm mt-1">
                Courses you purchased successfully
              </p>
            </div>

            <button
              onClick={fetchMyCourses}
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-400">Loading your courses...</p>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-14">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-blue-500/10 text-blue-300 flex items-center justify-center mb-5">
                <BookOpen size={30} />
              </div>

              <h3 className="text-2xl font-black mb-3">No enrolled courses yet</h3>

              <p className="text-slate-400 mb-6">
                Buy a course to start learning.
              </p>

              <Link
                to="/courses"
                className="inline-flex px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((item) => {
                const course = item.course;

                const lessonsCount =
                  course.sections?.reduce((total, section) => {
                    return total + (section.lessons?.length || 0);
                  }, 0) || 0;

                return (
                  <div
                    key={item.enrollmentId}
                    className="rounded-3xl bg-slate-950 border border-white/10 overflow-hidden hover:border-blue-500/40"
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-44 w-full object-cover"
                    />

                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold border border-blue-500/20">
                          {course.category}
                        </span>

                        <span className="text-xs text-slate-400">
                          {course.level}
                        </span>
                      </div>

                      <h3 className="text-xl font-black mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                        {course.shortDescription}
                      </p>

                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-5">
                        <Clock size={16} />
                        {lessonsCount} lessons
                      </div>

                      <Link
                        to={`/learn/${course.slug}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black"
                      >
                        Continue Learning
                        <PlayCircle size={18} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default StudentDashboardPage;