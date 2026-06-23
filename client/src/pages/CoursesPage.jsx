import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "../services/api";
import CourseCard from "../components/CourseCard";

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCourses = async (searchValue = "") => {
    try {
      setLoading(true);

      const res = await api.get("/courses", {
        params: { search: searchValue },
      });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchCourses(search);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute bottom-10 right-20 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <p className="text-blue-400 font-bold mb-4">Course Library</p>

          <h1 className="text-5xl md:text-6xl font-black mb-6">
            Explore courses
          </h1>

          <p className="text-slate-300 text-lg max-w-2xl mb-10">
            Browse practical web development courses, preview lessons, and
            enroll securely when you are ready.
          </p>

          <form
            onSubmit={handleSubmit}
            className="max-w-3xl rounded-3xl bg-white/5 border border-white/10 p-3 flex gap-3 backdrop-blur"
          >
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search React, JavaScript, HTML..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-blue-500"
              />
            </div>

            <button className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black">All Courses</h2>
            <p className="text-slate-400 mt-2">
              {courses.length} courses available
            </p>
          </div>

          <button className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300">
            <SlidersHorizontal size={18} />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-slate-400">
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-14 text-center">
            <h2 className="text-3xl font-black mb-3">No courses found</h2>
            <p className="text-slate-400">
              Try searching with another keyword.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default CoursesPage;
