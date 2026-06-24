import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Loader2 } from "lucide-react";
import { api } from "../../services/api";

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const StudentCertificatesPanel = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);

        const res = await api.get("/certificates/my");

        setCertificates(res.data.certificates || []);
      } catch (error) {
        console.error("Failed to fetch certificates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  return (
    <section className="mt-10 rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 text-yellow-300 flex items-center justify-center">
            <Award size={24} />
          </div>

          <div>
            <h2 className="text-2xl font-black">My Certificates</h2>
            <p className="text-slate-400 mt-1">
              View and download your completed course certificates.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={22} />
          Loading certificates...
        </div>
      ) : certificates.length === 0 ? (
        <div className="p-6 text-slate-400">
          No certificates yet. Complete a course 100% to generate your first certificate.
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {certificates.map((certificate) => (
            <div
              key={certificate._id}
              className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-white/[0.03]"
            >
              <div>
                <h3 className="text-lg font-black text-white">
                  {certificate.courseTitle}
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  Certificate ID: {certificate.certificateId}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Issued on {formatDate(certificate.issuedAt)}
                </p>
              </div>

              <Link
                to={`/certificates/${certificate.certificateId}`}
                className="inline-flex justify-center px-5 py-3 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black"
              >
                View Certificate
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StudentCertificatesPanel;