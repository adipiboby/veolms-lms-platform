import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  Database,
  IndianRupee,
  Layers,
  Loader2,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

import { api } from "../services/api";

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatNumber = (value = 0) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const formatBytes = (bytes = 0) => {
  const value = Number(bytes || 0);

  if (value === 0) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );

  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${
    units[index]
  }`;
};

const formatDate = (date) => {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const getCourseTitle = (item) => {
  return (
    item?.course?.title || item?.courseTitle || item?.title || "Untitled Course"
  );
};

const getStudentName = (item) => {
  return (
    item?.student?.name ||
    item?.user?.name ||
    item?.studentName ||
    item?.userName ||
    "Student"
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-400/20",
    green: "bg-green-500/10 text-green-300 border-green-400/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-400/20",
    purple: "bg-purple-500/10 text-purple-300 border-purple-400/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-400/20",
  };

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-400">{title}</p>

          <h3 className="mt-4 break-words text-4xl font-black text-white">
            {value}
          </h3>

          <p className="mt-4 leading-6 text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
            toneClasses[tone] || toneClasses.blue
          }`}
        >
          <Icon size={26} />
        </div>
      </div>
    </article>
  );
};

const SectionCard = ({ title, subtitle, children, action }) => {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>

          {subtitle && <p className="mt-2 text-slate-400">{subtitle}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
};

const EmptyState = ({ icon: Icon, title, text }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
        <Icon size={28} />
      </div>

      <h3 className="mt-4 font-black text-white">{title}</h3>

      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
};

const AdminDashboardPage = () => {
  const [analytics, setAnalytics] = useState({
    totals: {},
    topCourses: [],
    recentEnrollments: [],
    recentReviews: [],
    meta: {},
  });

  const [storageOverview, setStorageOverview] = useState({});
  const [recentVideos, setRecentVideos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const totals = analytics?.totals || {};

  const cleanTopCourses = useMemo(() => {
    return (analytics?.topCourses || []).filter((course) => {
      return course?.title || course?.course?.title || course?.courseTitle;
    });
  }, [analytics?.topCourses]);

  const cleanRecentEnrollments = useMemo(() => {
    return (analytics?.recentEnrollments || []).filter((enrollment) => {
      return enrollment?.student || enrollment?.user || enrollment?.course;
    });
  }, [analytics?.recentEnrollments]);

  const cleanRecentReviews = useMemo(() => {
    return (analytics?.recentReviews || []).filter((review) => {
      return review?.course || review?.courseTitle || review?.comment;
    });
  }, [analytics?.recentReviews]);

  const totalVideos =
    Number(totals?.totalVideos || 0) ||
    Number(storageOverview?.totalVideos || 0) ||
    Number(storageOverview?.totalFiles || 0) ||
    recentVideos.length;

  const storageUsedBytes =
    Number(storageOverview?.totalSizeBytes || 0) ||
    Number(storageOverview?.totalStorageBytes || 0) ||
    Number(storageOverview?.usedBytes || 0) ||
    Number(storageOverview?.totalSize || 0);

  const averageVideoSizeBytes =
    Number(storageOverview?.averageVideoSizeBytes || 0) ||
    Number(storageOverview?.avgSizeBytes || 0) ||
    (totalVideos > 0 ? storageUsedBytes / totalVideos : 0);

  const revenueSource =
    analytics?.meta?.revenueSource === "payments" ? "Payments" : "Estimated";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setPageError("");

      const [analyticsResult, storageResult] = await Promise.allSettled([
        api.get("/admin/analytics"),
        api.get("/videos/admin/storage"),
      ]);

      if (analyticsResult.status === "fulfilled") {
        const analyticsData =
          analyticsResult.value.data?.analytics ||
          analyticsResult.value.data?.data ||
          analyticsResult.value.data;

        setAnalytics({
          totals: analyticsData?.totals || {},
          topCourses: analyticsData?.topCourses || [],
          recentEnrollments: analyticsData?.recentEnrollments || [],
          recentReviews: analyticsData?.recentReviews || [],
          meta: analyticsData?.meta || {},
        });
      } else {
        console.error("ADMIN_ANALYTICS_ERROR:", analyticsResult.reason);
        setPageError("Unable to load admin analytics. Please try again.");
      }

      if (storageResult.status === "fulfilled") {
        const storageData = storageResult.value.data || {};

        setStorageOverview(
          storageData?.overview ||
            storageData?.storage ||
            storageData?.storageOverview ||
            {},
        );

        setRecentVideos(
          storageData?.recentVideos ||
            storageData?.videos ||
            storageData?.assets ||
            [],
        );
      } else {
        console.warn("ADMIN_STORAGE_OVERVIEW_SKIPPED:", storageResult.reason);
        setStorageOverview({});
        setRecentVideos([]);
      }
    } catch (error) {
      console.error("ADMIN_DASHBOARD_ERROR:", error);
      setPageError("Unable to load admin dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-10 text-white">
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <Loader2 size={44} className="animate-spin text-blue-400" />

          <p className="mt-4 font-semibold text-slate-400">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8">
          <div className="flex items-center gap-3 text-red-200">
            <AlertCircle size={28} />
            <h1 className="text-2xl font-black">Dashboard Error</h1>
          </div>

          <p className="mt-4 text-slate-300">{pageError}</p>

          <button
            type="button"
            onClick={fetchDashboardData}
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
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.15),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,1))]" />

        <div className="relative mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200">
                <BarChart3 size={17} />
                Admin Overview
              </div>

              <h1 className="text-4xl font-black md:text-5xl">
                Admin Dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Track students, courses, enrollments, revenue, videos, reviews,
                and platform activity in one clean dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-200 hover:bg-white/10"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Students"
            value={formatNumber(totals?.totalStudents)}
            subtitle="Registered student accounts"
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Total Courses"
            value={formatNumber(totals?.totalCourses)}
            subtitle={`${formatNumber(
              totals?.publishedCourses,
            )} published • ${formatNumber(totals?.draftCourses)} drafts`}
            icon={BookOpen}
            tone="purple"
          />

          <StatCard
            title="Total Enrollments"
            value={formatNumber(totals?.totalEnrollments)}
            subtitle="Students enrolled in courses"
            icon={Layers}
            tone="green"
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(totals?.totalRevenue)}
            subtitle={`${revenueSource} revenue source`}
            icon={IndianRupee}
            tone="yellow"
          />

          <StatCard
            title="Uploaded Videos"
            value={formatNumber(totalVideos)}
            subtitle="Private course video assets"
            icon={Video}
            tone="cyan"
          />

          <StatCard
            title="Storage Used"
            value={formatBytes(storageUsedBytes)}
            subtitle="Total uploaded video storage"
            icon={Database}
            tone="blue"
          />

          <StatCard
            title="Average Rating"
            value={
              Number(totals?.averageRating || 0) > 0
                ? Number(totals?.averageRating || 0).toFixed(1)
                : "New"
            }
            subtitle={`${formatNumber(totals?.totalReviews)} total reviews`}
            icon={Star}
            tone="yellow"
          />

          <StatCard
            title="Video Security"
            value="Private"
            subtitle="Signed URLs protect videos"
            icon={CheckCircle}
            tone="green"
          />

          <StatCard
            title="Total Reviews"
            value={formatNumber(totals?.totalReviews)}
            subtitle="Course feedback collected"
            icon={MessageSquare}
            tone="purple"
          />

          <StatCard
            title="Admin Users"
            value={formatNumber(totals?.totalAdmins)}
            subtitle="Users with admin access"
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Average Video Size"
            value={formatBytes(averageVideoSizeBytes)}
            subtitle="Average storage per uploaded video"
            icon={Database}
            tone="cyan"
          />

          <StatCard
            title="Revenue Source"
            value={revenueSource}
            subtitle={
              revenueSource === "Payments"
                ? "Using payment records"
                : "Using estimated revenue"
            }
            icon={TrendingUp}
            tone="green"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Top Courses"
            subtitle="Courses ranked by enrollment count."
            action={
              <Link
                to="/admin/courses"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                Manage Courses
                <ArrowRight size={16} />
              </Link>
            }
          >
            {cleanTopCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No course data yet"
                text="Top courses will appear after students enroll."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-white/[0.04] text-sm text-slate-400">
                      <tr>
                        <th className="px-5 py-4 font-bold">Course</th>
                        <th className="px-5 py-4 font-bold">Enrollments</th>
                        <th className="px-5 py-4 font-bold">Rating</th>
                        <th className="px-5 py-4 font-bold">Revenue</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10">
                      {cleanTopCourses.map((course) => (
                        <tr key={course?._id || course?.title}>
                          <td className="px-5 py-4">
                            <p className="line-clamp-1 font-black text-white">
                              {getCourseTitle(course)}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {formatNumber(
                              course?.enrollmentCount ||
                                course?.totalEnrollments ||
                                course?.enrollments ||
                                0,
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {Number(
                              course?.averageRating || course?.rating || 0,
                            ) > 0
                              ? Number(
                                  course?.averageRating || course?.rating || 0,
                                ).toFixed(1)
                              : "New"}
                          </td>

                          <td className="px-5 py-4 font-bold text-green-300">
                            {formatCurrency(course?.revenue || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent Reviews"
            subtitle="Latest student feedback from courses."
          >
            {cleanRecentReviews.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No reviews yet"
                text="Recent reviews will appear here."
              />
            ) : (
              <div className="space-y-4">
                {cleanRecentReviews.slice(0, 5).map((review) => (
                  <article
                    key={
                      review?._id ||
                      `${getCourseTitle(review)}-${review?.createdAt}`
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-white">
                          {getCourseTitle(review)}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          by {getStudentName(review)}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-sm font-black text-yellow-200">
                        <Star
                          size={15}
                          className="fill-yellow-300 text-yellow-300"
                        />
                        {Number(review?.rating || 0)}
                      </div>
                    </div>

                    {review?.comment && (
                      <p className="mt-4 line-clamp-2 leading-6 text-slate-300">
                        {review.comment}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-500">
                      {formatDate(review?.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Recent Enrollments"
          subtitle="Latest students who joined courses."
        >
          {cleanRecentEnrollments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No enrollments yet"
              text="Recent enrollments will appear after students buy or join courses."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-white/[0.04] text-sm text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-bold">Student</th>
                      <th className="px-5 py-4 font-bold">Course</th>
                      <th className="px-5 py-4 font-bold">Date</th>
                      <th className="px-5 py-4 font-bold">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {cleanRecentEnrollments.slice(0, 8).map((enrollment) => (
                      <tr key={enrollment?._id || enrollment?.createdAt}>
                        <td className="px-5 py-4">
                          <p className="font-black text-white">
                            {getStudentName(enrollment)}
                          </p>

                          {(enrollment?.student?.email ||
                            enrollment?.user?.email) && (
                            <p className="mt-1 text-sm text-slate-500">
                              {enrollment?.student?.email ||
                                enrollment?.user?.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {getCourseTitle(enrollment)}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {formatDate(
                            enrollment?.createdAt || enrollment?.enrolledAt,
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-green-300">
                          {formatCurrency(
                            enrollment?.amount ||
                              enrollment?.price ||
                              enrollment?.course?.price ||
                              0,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Video Uploads"
          subtitle="Latest uploaded course videos."
        >
          {recentVideos.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No videos uploaded yet"
              text="Uploaded videos will appear here after you add course lessons."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentVideos.slice(0, 6).map((video) => (
                <article
                  key={video?._id || video?.key || video?.fileName}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <Video size={24} />
                  </div>

                  <h3 className="line-clamp-2 font-black text-white">
                    {video?.title ||
                      video?.originalName ||
                      video?.fileName ||
                      "Course Video"}
                  </h3>

                  <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <p>Size: {formatBytes(video?.size || video?.sizeBytes)}</p>

                    <p>
                      Uploaded:{" "}
                      {formatDate(video?.createdAt || video?.uploadedAt)}
                    </p>

                    <p className="inline-flex items-center gap-2 text-green-300">
                      <CheckCircle size={15} />
                      Protected video asset
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-200">
                <Award size={16} />
                Admin Workflow
              </div>

              <h2 className="text-2xl font-black md:text-3xl">
                Keep dashboard for analytics. Manage uploads inside courses.
              </h2>

              <p className="mt-3 max-w-3xl text-slate-400">
                Uploading videos should happen from course or lesson management,
                not from the main dashboard. This keeps the dashboard clean and
                professional.
              </p>
            </div>

            <Link
              to="/admin/courses"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white hover:bg-blue-700"
            >
              Manage Courses
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboardPage;
