import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import CourseCard from "../components/CourseCard";

const HomePage = () => {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const res = await api.get("/courses/featured");
        setFeaturedCourses(Array.isArray(res.data?.courses) ? res.data.courses : []);
      } catch (error) {
        console.error("Failed to fetch featured courses", error);
        setFeaturedCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  return (
    <main className="bg-slate-950 text-white overflow-hidden">
      <section className="relative min-h-[calc(100vh-74px)] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-72 w-72 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 h-96 w-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e293b_0,transparent_35%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-200 mb-7">
              <Sparkles size={16} />
              <span className="text-sm font-semibold">
                Production-like LMS for modern learners
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[1.02] tracking-tight mb-7">
              Learn skills.
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Track progress.
              </span>
              Grow faster.
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-9 leading-relaxed">
              Discover structured web development courses, preview lessons,
              enroll securely, and continue learning from where you stopped.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-2xl shadow-blue-600/20 hover:scale-[1.02]"
              >
                Explore Courses
                <ArrowRight size={20} />
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/10 border border-white/10 text-white font-bold hover:bg-white/15"
              >
                Start Learning
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-xl">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <h3 className="text-2xl font-black">3+</h3>
                <p className="text-sm text-slate-400">Courses</p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <h3 className="text-2xl font-black">15+</h3>
                <p className="text-sm text-slate-400">Lessons</p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <h3 className="text-2xl font-black">100%</h3>
                <p className="text-sm text-slate-400">Online</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2rem] blur-2xl" />

            <div className="relative rounded-[2rem] bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden backdrop-blur">
              <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>

                <span className="text-xs text-slate-400">
                  Student Dashboard Preview
                </span>
              </div>

              <div className="p-6 grid grid-cols-12 gap-5">
                <aside className="hidden sm:block col-span-3 rounded-2xl bg-slate-950/80 border border-white/10 p-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6" />

                  <div className="space-y-3">
                    <div className="h-8 rounded-lg bg-blue-500/20 border border-blue-400/20" />
                    <div className="h-8 rounded-lg bg-white/5" />
                    <div className="h-8 rounded-lg bg-white/5" />
                    <div className="h-8 rounded-lg bg-white/5" />
                  </div>
                </aside>

                <div className="col-span-12 sm:col-span-9 space-y-5">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-5">
                    <p className="text-sm text-blue-100 mb-2">Continue Learning</p>
                    <h3 className="text-2xl font-black mb-4">React.js Complete Course</h3>

                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-[68%] bg-white rounded-full" />
                    </div>

                    <p className="text-sm text-blue-100 mt-3">68% completed</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4">
                      <BookOpen className="text-blue-400 mb-3" size={22} />
                      <h4 className="font-black">3</h4>
                      <p className="text-xs text-slate-400">Courses</p>
                    </div>

                    <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4">
                      <BarChart3 className="text-green-400 mb-3" size={22} />
                      <h4 className="font-black">68%</h4>
                      <p className="text-xs text-slate-400">Progress</p>
                    </div>

                    <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4">
                      <Users className="text-purple-400 mb-3" size={22} />
                      <h4 className="font-black">1.2k</h4>
                      <p className="text-xs text-slate-400">Learners</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <PlayCircle className="text-white" size={28} />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold">Resume: React Hooks</h4>
                      <p className="text-sm text-slate-400">Last watched 2 hours ago</p>
                    </div>

                    <button className="px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-sm">
                      Play
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-7">
            <BookOpen className="text-blue-400 mb-5" size={34} />
            <h3 className="text-xl font-black mb-3">Structured Courses</h3>
            <p className="text-slate-400 leading-relaxed">
              Learn from organized sections, lessons, previews, and clear
              curriculum flow.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-7">
            <ShieldCheck className="text-green-400 mb-5" size={34} />
            <h3 className="text-xl font-black mb-3">Secure Access</h3>
            <p className="text-slate-400 leading-relaxed">
              Role-based authorization, protected routes, and verified
              enrollment access.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-7">
            <CheckCircle className="text-purple-400 mb-5" size={34} />
            <h3 className="text-xl font-black mb-3">Progress Tracking</h3>
            <p className="text-slate-400 leading-relaxed">
              Resume lessons, track learning percentage, and continue from the
              last watched lesson.
            </p>
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="text-blue-400 font-bold mb-3">Featured Courses</p>
            <h2 className="text-4xl md:text-5xl font-black">
              Start learning today
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl">
              Explore beginner-friendly and practical courses built for web
              development learners.
            </p>
          </div>

          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-blue-300 font-bold hover:text-white"
          >
            View all courses
            <ArrowRight size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-slate-400">
            Loading courses...
          </div>
        ) : featuredCourses.length === 0 ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-slate-400">
            No featured courses found.
          </div>
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