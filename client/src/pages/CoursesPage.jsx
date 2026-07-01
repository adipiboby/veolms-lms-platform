import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

import { api } from "../services/api";

const formatCurrency = (amount = 0) => {
  const value = Number(amount || 0);

  if (value === 0) return "Free";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const getCourseImage = (course) => {
  return (
    course?.thumbnail ||
    course?.thumbnailUrl ||
    course?.image ||
    course?.coverImage ||
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop"
  );
};

const getCourseRating = (course) => {
  return Number(
    course?.averageRating ||
      course?.rating ||
      course?.ratingsAverage ||
      course?.avgRating ||
      0,
  );
};

const getCourseReviewsCount = (course) => {
  return Number(
    course?.totalReviews ||
      course?.reviewsCount ||
      course?.reviewCount ||
      course?.ratingsQuantity ||
      0,
  );
};

const getCourseEnrollments = (course) => {
  return Number(
    course?.totalEnrollments ||
      course?.enrollments ||
      course?.enrollmentsCount ||
      course?.studentsCount ||
      0,
  );
};

const getCourseLessonsCount = (course) => {
  if (!Array.isArray(course?.sections)) {
    return Number(course?.lessonsCount || 0);
  }

  return course.sections.reduce((total, section) => {
    return (
      total + (Array.isArray(section.lessons) ? section.lessons.length : 0)
    );
  }, 0);
};

const PremiumCourseCard = ({ course }) => {
  const rating = getCourseRating(course);
  const reviewsCount = getCourseReviewsCount(course);
  const enrollments = getCourseEnrollments(course);
  const lessonsCount = getCourseLessonsCount(course);

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20 dark:hover:border-blue-400/40 dark:hover:bg-white/[0.07]">
      <div className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-900">
        <img
          src={getCourseImage(course)}
          alt={course?.title || "Course thumbnail"}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-black text-white backdrop-blur">
          Preview
        </div>

        <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur">
          <PlayCircle size={25} />
        </div>

        <div className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-2 text-sm font-black text-white backdrop-blur">
          {formatCurrency(course?.price)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-200">
            <Star
              size={15}
              className="shrink-0 fill-yellow-400 text-yellow-400 dark:fill-yellow-300 dark:text-yellow-300"
            />

            <span className="font-black">
              {rating > 0 ? rating.toFixed(1) : "New"}
            </span>

            <span className="truncate text-yellow-600/80 dark:text-yellow-100/70">
              ({reviewsCount})
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Users size={15} />
            <span>{enrollments}</span>
          </div>
        </div>

        <h2 className="line-clamp-2 break-words text-xl font-black leading-tight text-slate-950 dark:text-white">
          {course?.title}
        </h2>

        <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-400">
          {course?.shortDescription ||
            course?.description ||
            "Learn with structured lessons, secure videos, notes, progress tracking, reviews, and certificates."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
            <BookOpen
              size={16}
              className="shrink-0 text-blue-600 dark:text-blue-300"
            />
            <span className="truncate">{lessonsCount} lessons</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
            <Clock
              size={16}
              className="shrink-0 text-green-600 dark:text-green-300"
            />
            <span className="truncate">Lifetime</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Instructor
            </p>

            <p className="truncate font-bold text-slate-800 dark:text-slate-200">
              {course?.instructor ||
                course?.createdBy?.name ||
                "VeoLMS Instructor"}
            </p>
          </div>

          <Link
            to={`/courses/${course?.slug || course?._id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            View
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
};

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const shouldShowSearchBar = courses.length > 10;

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await api.get("/courses");

      const loadedCourses =
        response.data?.courses || response.data?.data || response.data || [];

      setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
    } catch (error) {
      console.error("COURSES_PAGE_ERROR:", {
        status: error?.response?.status,
        message: error?.response?.data?.message,
        error,
      });

      setPageError("Unable to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!shouldShowSearchBar) {
      setSearchQuery("");
      setPriceFilter("all");
      setSortBy("latest");
    }
  }, [shouldShowSearchBar]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    if (shouldShowSearchBar) {
      const query = searchQuery.trim().toLowerCase();

      if (query) {
        result = result.filter((course) => {
          return (
            course?.title?.toLowerCase().includes(query) ||
            course?.shortDescription?.toLowerCase().includes(query) ||
            course?.description?.toLowerCase().includes(query) ||
            course?.instructor?.toLowerCase().includes(query) ||
            course?.category?.toLowerCase().includes(query)
          );
        });
      }

      if (priceFilter === "free") {
        result = result.filter((course) => Number(course?.price || 0) === 0);
      }

      if (priceFilter === "paid") {
        result = result.filter((course) => Number(course?.price || 0) > 0);
      }

      if (sortBy === "price-low") {
        result.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
      }

      if (sortBy === "price-high") {
        result.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
      }

      if (sortBy === "popular") {
        result.sort(
          (a, b) => getCourseEnrollments(b) - getCourseEnrollments(a),
        );
      }

      if (sortBy === "rating") {
        result.sort((a, b) => getCourseRating(b) - getCourseRating(a));
      }

      if (sortBy === "latest") {
        result.sort(
          (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
        );
      }
    }

    return result;
  }, [courses, searchQuery, priceFilter, sortBy, shouldShowSearchBar]);

  const resetFilters = () => {
    setSearchQuery("");
    setPriceFilter("all");
    setSortBy("latest");
  };

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <Loader2
            size={44}
            className="animate-spin text-blue-500 dark:text-blue-400"
          />

          <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
            Loading courses...
          </p>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-200 bg-red-50 p-8 dark:border-red-500/30 dark:bg-red-500/10">
          <h1 className="text-2xl font-black text-red-700 dark:text-red-200">
            Courses Error
          </h1>

          <p className="mt-3 text-slate-700 dark:text-slate-300">{pageError}</p>

          <button
            type="button"
            onClick={fetchCourses}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.08),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0),rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.14),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,1))]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-10">
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
              <BookOpen size={16} />
              Courses
            </div>

            <h1 className="text-3xl font-black text-slate-950 md:text-5xl dark:text-white">
              Explore available courses
            </h1>

            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
              Learn with structured lessons, secure videos, progress tracking,
              notes, reviews, and certificates.
            </p>
          </div>

          {shouldShowSearchBar && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 backdrop-blur-xl md:p-5 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                <div className="relative min-w-0">
                  <Search
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                  />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search courses..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-4 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/80 dark:text-white dark:placeholder:text-slate-500"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                <select
                  value={priceFilter}
                  onChange={(event) => setPriceFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-bold text-slate-950 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-bold text-slate-950 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                >
                  <option value="latest">Latest</option>
                  <option value="popular">Popular</option>
                  <option value="rating">Rating</option>
                  <option value="price-low">Price Low</option>
                  <option value="price-high">Price High</option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <RefreshCw size={17} />
                  Reset
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Showing{" "}
                  <span className="font-black text-slate-950 dark:text-white">
                    {filteredCourses.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-black text-slate-950 dark:text-white">
                    {courses.length}
                  </span>{" "}
                  courses
                </p>

                <p className="inline-flex items-center gap-2">
                  <CheckCircle
                    size={16}
                    className="text-green-600 dark:text-green-300"
                  />
                  Search is enabled because courses are more than 10
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        {filteredCourses.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <Search size={30} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
              No courses found
            </h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Try changing your search or filters.
            </p>

            {shouldShowSearchBar && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <PremiumCourseCard
                key={course?._id || course?.slug}
                course={course}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                <Sparkles size={16} />
                Learning Path
              </div>

              <h2 className="text-2xl font-black text-slate-950 md:text-3xl dark:text-white">
                Start one course. Complete lessons. Earn your certificate.
              </h2>

              <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
                VeoLMS helps students learn with secure video lessons, progress
                tracking, notes, reviews, and certificates.
              </p>
            </div>

            <Link
              to="/student/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white hover:bg-blue-700"
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CoursesPage;
