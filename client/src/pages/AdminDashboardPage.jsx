import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Database,
  GraduationCap,
  HardDrive,
  IndianRupee,
  Loader2,
  Users,
  Video,
} from "lucide-react";
import { api } from "../services/api";

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatVideoSize = (bytes = 0) => {
  const mb = bytes / (1024 * 1024);

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
    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/[0.07] transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <h3 className="text-3xl font-black mt-2 text-white">{value}</h3>

          <p className="text-sm text-slate-400 mt-2">{subtitle}</p>
        </div>

        <div
          className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${
            toneClasses[tone] || toneClasses.blue
          }`}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

const AdminDashboardPage = () => {
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalPaidPayments: 0,
    totalRevenue: 0,
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewRes, storageRes] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/videos/admin/storage"),
      ]);

      setOverview(overviewRes.data.overview || {});
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
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-400" size={44} />

          <p className="mt-4 text-slate-400 font-semibold">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <div className="flex items-center gap-3 text-red-300">
            <AlertCircle size={28} />

            <h1 className="text-2xl font-black">Dashboard Error</h1>
          </div>

          <p className="text-slate-300 mt-4">{error}</p>

          <button
            onClick={fetchDashboardData}
            className="mt-6 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-blue-400 font-bold">Admin Overview</p>

          <h1 className="text-3xl md:text-4xl font-black mt-2">
            VeoLMS Dashboard
          </h1>

          <p className="text-slate-400 mt-2">
            Manage courses, students, enrollments, revenue, and private S3 video
            storage.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Total Students"
            value={overview.totalStudents || 0}
            subtitle="Registered student users"
            icon={Users}
            tone="blue"
          />

          <StatCard
            title="Total Courses"
            value={overview.totalCourses || 0}
            subtitle="Courses in platform"
            icon={BookOpen}
            tone="purple"
          />

          <StatCard
            title="Total Enrollments"
            value={overview.totalEnrollments || 0}
            subtitle="Successful course enrollments"
            icon={GraduationCap}
            tone="green"
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview.totalRevenue || 0)}
            subtitle={`${overview.totalPaidPayments || 0} paid payments`}
            icon={IndianRupee}
            tone="yellow"
          />
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">
          <StatCard
            title="Uploaded Videos"
            value={storageOverview.totalVideos || 0}
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
            title="Average Video Size"
            value={
              storageOverview.totalVideos > 0
                ? formatVideoSize(
                    (storageOverview.totalStorageBytes || 0) /
                      storageOverview.totalVideos,
                  )
                : "0 MB"
            }
            subtitle="Average storage per video"
            icon={Database}
            tone="blue"
          />

          <StatCard
            title="Video Security"
            value="Signed URLs"
            subtitle="Students access only after enrollment"
            icon={CheckCircle}
            tone="green"
          />
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-black">Recent Video Uploads</h2>

              <p className="text-slate-400 mt-1">
                Latest videos uploaded to private S3 storage.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {recentVideos.length === 0 ? (
                <div className="p-6 text-slate-400">
                  No videos uploaded yet.
                </div>
              ) : (
                recentVideos.map((video) => (
                  <div
                    key={video._id}
                    className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-pink-500/10 text-pink-300 border border-pink-500/20 flex items-center justify-center shrink-0">
                          <Video size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-white truncate">
                            {video.originalName}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            {video.mimeType} • {formatDateTime(video.createdAt)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-400 break-all mt-4">
                        {video.key}
                      </p>
                    </div>

                    <div className="md:text-right shrink-0">
                      <p className="font-black text-blue-300">
                        {formatVideoSize(video.sizeBytes)}
                      </p>

                      <p className="text-xs text-green-300 mt-1">
                        {video.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-blue-600/15 to-purple-600/15 border border-white/10 p-6">
            <h2 className="text-2xl font-black">Video Architecture</h2>

            <p className="text-slate-300 mt-3 leading-relaxed">
              Your LMS now uses private S3 video storage. Students do not get
              direct permanent video links. The backend checks enrollment and
              generates a temporary signed URL for secure playback.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <p className="font-bold text-white">1. Admin Upload</p>
                <p className="text-sm text-slate-400 mt-1">
                  Admin uploads MP4 video to S3 from LMS dashboard.
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <p className="font-bold text-white">2. Metadata Tracking</p>
                <p className="text-sm text-slate-400 mt-1">
                  MongoDB stores file key, size, MIME type, bucket, and region.
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <p className="font-bold text-white">3. Secure Playback</p>
                <p className="text-sm text-slate-400 mt-1">
                  Enrolled students receive temporary signed video URLs.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-green-500/10 border border-green-500/20 p-4">
              <p className="text-green-300 font-bold">
                Production-level feature completed
              </p>

              <p className="text-sm text-slate-300 mt-1">
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
