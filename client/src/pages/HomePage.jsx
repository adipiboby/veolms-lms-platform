import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldCheck, PlayCircle, BarChart3 } from "lucide-react";
import { api } from "../services/api";
import CourseCard from "../components/CourseCard";

const HomePage = () => {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
       const res = await api.get("/courses/featured");

console.log("Featured courses response:", res.data);

setFeaturedCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
      } catch (error) {
        console.error("Failed to fetch featured courses", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  return (
    <main>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold mb-6">
              Production-like LMS Platform
            </p>

            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              Learn job-ready skills with structured online courses
            </h1>

            <p className="text-lg text-slate-600 mb-8 max-w-xl">
              Browse courses, preview lessons, enroll securely, track your
              progress, and continue learning from where you stopped.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/courses"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-center hover:bg-blue-700"
              >
                Explore Courses
              </Link>

              <Link
                to="/register"
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold text-center border border-slate-200 hover:border-blue-600"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center mb-6">
              <PlayCircle size={80} className="text-white" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <h3 className="font-bold text-2xl text-blue-600">3+</h3>
                <p className="text-sm text-slate-600">Courses</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4 text-center">
                <h3 className="font-bold text-2xl text-green-600">15+</h3>
                <p className="text-sm text-slate-600">Lessons</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <h3 className="font-bold text-2xl text-purple-600">24/7</h3>
                <p className="text-sm text-slate-600">Access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <Search className="text-blue-600 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Discover Courses</h3>
            <p className="text-slate-600">
              Search and explore courses before creating an account.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <ShieldCheck className="text-green-600 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Secure Enrollment</h3>
            <p className="text-slate-600">
              Payment verification and protected course access.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <BarChart3 className="text-purple-600 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Track Progress</h3>
            <p className="text-slate-600">
              Continue learning from where you stopped.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Featured Courses
            </h2>
            <p className="text-slate-600 mt-2">
              Start learning with our most popular courses.
            </p>
          </div>

          <Link to="/courses" className="text-blue-600 font-semibold">
            View all
          </Link>
        </div>

        {loading ? (
          <p>Loading courses...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default HomePage;
