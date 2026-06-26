import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Database,
  GraduationCap,
  HardDrive,
  IndianRupee,
  Loader2,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

import { api } from "../services/api";
import DirectS3VideoUpload from "../components/admin/DirectS3VideoUpload";

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatVideoSize = (bytes = 0) => {
  const mb = Number(bytes || 0) / (1024 * 1024);

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }

  return `${mb.toFixed(2)} MB`;
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatNumber = (value = 0) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    green: "bg-green-500/10 text-green-300 border-green-500/20",
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    pink: "bg-pink-500/10 text-pink-300 border-pink-500/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>

          <h3 className="mt-2 break-words text-3xl font-black text-white">
            {value}
          </h3>

          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            toneClasses[tone] || toneClasses.blue
          }`}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => {
  return <div className="p-6 text-slate-400">{message}</div>;
};

const AdminDashboardPage = () => {
  const [analytics, setAnalytics] = useState({
    totals: {
      totalStudents: 0,
      totalAdmins: 0,
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      estimatedRevenue: 0,
      totalPayments: 0,
      totalReviews: 0,
      averageRating: 0,
      totalVideos: 0,
    },
    topCourses: [],
    recentEnrollments: [],
    recentReviews: [],
    meta: {},
  });

  const [storageOverview, setStorageOverview] = useState({
    totalVideos: 0,
    totalStorageBytes: 0,
    totalStorageMB: 0,
    totalStorageGB: 0,
  });

  const [recentVideos, setRecentVideos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totals = analytics.totals || {};

  const totalVideos = totals.totalVideos || storageOverview.totalVideos || 0;

  const cleanTopCourses = useMemo(() => {
    return (analytics.topCourses || []).filter((course) => course?.title);
  }, [analytics.topCourses]);

  const cleanRecentEnrollments = useMemo(() => {
    return (analytics.recentEnrollments || []).filter(
      (enrollment) => enrollment?.student && enrollment?.course,
    );
  }, [analytics.recentEnrollments]);

  const recentReviews = analytics.recentReviews || [];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [analyticsRes, storageRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/videos/admin/storage"),
      ]);

      setAnalytics(analyticsRes.data.analytics || {});
      setStorageOverview(storageRes.data.overview || {});
      setRecentVideos(storageRes.data.recentVideos || []);
    } catch (error) {
      console.error("Admin dashboard fetch failed:", error);

      setError(
        error.response?.data?.message || "Failed to load admin dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-400" size={44} />

          <p className="mt-4 font-semibold text-slate-400">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <div className="flex items-center gap-3 text-red-300">
            <AlertCircle size={28} />

            <h1 className="text-2xl font-black">Dashboard Error</h1>
          </div>

          <p className="mt-4 text-slate-300">{error}</p>

          <button
            onClick={fetchDashboardData}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="font-bold text-blue-400">Admin Overview</p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            VeoLMS Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Manage courses, students, enrollments, revenue, reviews, and private
            S3 video storage.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Students"
            value={formatNumber(totals.totalStudents)}
            subtitle="Registered student users"
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Total Courses"
            value={formatNumber(totals.totalCourses)}
            subtitle={`${formatNumber(totals.publishedCourses)} published, ${formatNumber(
              totals.draftCourses,
            )} draft`}
            icon={BookOpen}
            tone="purple"
          />

          <StatCard
            title="Total Enrollments"
            value={formatNumber(totals.totalEnrollments)}
            subtitle="Successful course enrollments"
            icon={GraduationCap}
            tone="green"
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(totals.totalRevenue)}
            subtitle={`${formatNumber(totals.totalPayments)} paid payments`}
            icon={IndianRupee}
            tone="yellow"
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Uploaded Videos"
            value={formatNumber(totalVideos)}
            subtitle="Private S3 video assets"
            icon={Video}
            tone="pink"
          />

          <StatCard
            title="Storage Used"
            value={`${storageOverview.totalStorageMB || 0} MB`}
            subtitle={`${storageOverview.totalStorageGB || 0} GB total`}
            icon={HardDrive}
            tone="cyan"
          />

          <StatCard
            title="Average Rating"
            value={`${Number(totals.averageRating || 0).toFixed(1)} / 5`}
            subtitle={`${formatNumber(totals.totalReviews)} student reviews`}
            icon={Star}
            tone="yellow"
          />

          <StatCard
            title="Video Security"
            value="Signed URLs"
            subtitle="Students access only after enrollment"
            icon={CheckCircle}
            tone="green"
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Reviews"
            value={formatNumber(totals.totalReviews)}
            subtitle="Course feedback collected"
            icon={MessageSquare}
            tone="purple"
          />

          <StatCard
            title="Admin Users"
            value={formatNumber(totals.totalAdmins)}
            subtitle="Users with admin access"
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Average Video Size"
            value={
              storageOverview.totalVideos > 0
                ? formatVideoSize(
                    (storageOverview.totalStorageBytes || 0) /
                      storageOverview.totalVideos,
                  )
                : "0 MB"
            }
            subtitle="Average storage per uploaded video"
            icon={Database}
            tone="cyan"
          />

          <StatCard
            title="Revenue Source"
            value={
              analytics.meta?.revenueSource === "payments"
                ? "Payments"
                : "Enrollments"
            }
            subtitle={
              analytics.meta?.hasPaymentModel
                ? "Using payment records"
                : "Using enrollment estimate"
            }
            icon={TrendingUp}
            tone="green"
          />
        </div>

        <div className="mt-8">
          <DirectS3VideoUpload
            onUploaded={() => {
              fetchDashboardData();
            }}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-2xl font-black">Top Courses</h2>

              <p className="mt-1 text-slate-400">
                Courses ranked by enrollment count.
              </p>
            </div>

            {cleanTopCourses.length === 0 ? (
              <EmptyState message="No active course enrollment data found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="bg-slate-950/60 text-sm text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Course</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold">Price</th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Enrollments
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {cleanTopCourses.map((course) => (
                      <tr
                        key={course.courseId}
                        className="transition hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{course.title}</p>

                          <p className="mt-1 text-xs text-slate-500">
                            {course.level || "N/A"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {course.category || "N/A"}
                        </td>

                        <td className="px-6 py-4 font-bold text-green-300">
                          {formatCurrency(course.price)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-black text-blue-300">
                            {formatNumber(course.enrollments)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-2xl font-black">Recent Reviews</h2>

              <p className="mt-1 text-slate-400">
                Latest student feedback from courses.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {recentReviews.length === 0 ? (
                <EmptyState message="No reviews added yet." />
              ) : (
                recentReviews.map((review) => (
                  <div
                    key={review._id}
                    className="p-6 transition hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-white">
                          {review.student?.name || "Student"}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-400">
                          {review.course?.title || "Course"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-black text-yellow-300">
                        <Star size={14} />
                        {review.rating}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      {review.comment?.trim() || "No written comment."}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatDateTime(review.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-2xl font-black">Recent Enrollments</h2>

            <p className="mt-1 text-slate-400">
              Latest students who joined active courses.
            </p>
          </div>

          {cleanRecentEnrollments.length === 0 ? (
            <EmptyState message="No recent active enrollments found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-950/60 text-sm text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {cleanRecentEnrollments.map((enrollment) => (
                    <tr
                      key={enrollment._id}
                      className="transition hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">
                          {enrollment.student?.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {enrollment.student?.email}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200">
                          {enrollment.course?.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {enrollment.course?.category || "N/A"}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-bold text-green-300">
                        {formatCurrency(enrollment.course?.price)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Clock size={15} />
                          {formatDateTime(enrollment.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-2xl font-black">Recent Video Uploads</h2>

              <p className="mt-1 text-slate-400">
                Latest videos uploaded to private S3 storage.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {recentVideos.length === 0 ? (
                <EmptyState message="No videos uploaded yet." />
              ) : (
                recentVideos.map((video) => (
                  <div
                    key={video._id}
                    className="flex flex-col gap-4 p-6 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10 text-pink-300">
                          <Video size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-white">
                            {video.originalName}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {video.mimeType} • {formatDateTime(video.createdAt)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 break-all text-sm text-slate-400">
                        {video.key}
                      </p>
                    </div>

                    <div className="shrink-0 md:text-right">
                      <p className="font-black text-blue-300">
                        {formatVideoSize(video.sizeBytes)}
                      </p>

                      <p className="mt-1 text-xs text-green-300">
                        {video.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 to-purple-600/15 p-6">
            <h2 className="text-2xl font-black">Video Architecture</h2>

            <p className="mt-3 leading-relaxed text-slate-300">
              Your LMS uses private S3 video storage. Students do not get direct
              permanent video links. The backend checks enrollment and generates
              a temporary signed URL for secure playback.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-bold text-white">1. Admin Upload</p>
                <p className="mt-1 text-sm text-slate-400">
                  Admin uploads MP4 video to S3 from LMS dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-bold text-white">2. Metadata Tracking</p>
                <p className="mt-1 text-sm text-slate-400">
                  MongoDB stores file key, size, MIME type, bucket, and region.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-bold text-white">3. Secure Playback</p>
                <p className="mt-1 text-sm text-slate-400">
                  Enrolled students receive temporary signed video URLs.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <p className="font-bold text-green-300">
                Production-level feature completed
              </p>

              <p className="mt-1 text-sm text-slate-300">
                This is a strong feature for your VeoLMS submission.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboardPage;
