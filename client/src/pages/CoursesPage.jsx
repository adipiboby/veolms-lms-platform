import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
        params: {
          search: searchValue,
        },
      });

      setCourses(res.data.courses);
    } catch (error) {
      console.error("Failed to fetch courses", error);
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
    <main className="max-w-7xl mx-auto px-4 py-12">
      <section className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
          Explore Courses
        </h1>

        <p className="text-slate-600 max-w-2xl">
          Search courses by title, category, or instructor and start learning
          with structured lessons.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-2xl border border-slate-200 mb-10 flex gap-3"
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
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
          />
        </div>

        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
          Search
        </button>
      </form>

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
          <h2 className="text-2xl font-bold mb-2">No courses found</h2>
          <p className="text-slate-600">Try searching with another keyword.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </main>
  );
};

export default CoursesPage;
