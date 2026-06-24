import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, CheckCircle, Loader2, Printer } from "lucide-react";
import { api } from "../services/api";

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const CertificatePage = () => {
  const { certificateId } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/certificates/verify/${certificateId}`);

        setCertificate(res.data.certificate);
      } catch (error) {
        console.error("Certificate fetch failed:", error);

        setError(
          error.response?.data?.message || "Certificate verification failed",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-400 mx-auto" size={44} />

          <p className="mt-4 text-slate-400 font-semibold">
            Loading certificate...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pt-28 px-4">
        <div className="max-w-3xl mx-auto rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black text-red-300">
            Certificate Not Found
          </h1>

          <p className="text-slate-300 mt-3">{error}</p>

          <Link
            to="/"
            className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          @media print {
            html,
            body,
            #root {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: hidden !important;
            }

            #root > * {
              display: none !important;
            }

            #root > .certificate-print-page {
              display: flex !important;
            }

            .print-hidden {
              display: none !important;
            }

            .certificate-print-page {
              width: 100% !important;
              height: calc(210mm - 16mm) !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: hidden !important;
              align-items: center !important;
              justify-content: center !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            .certificate-print-area {
              width: calc(297mm - 16mm) !important;
              height: calc(210mm - 16mm) !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }

            .certificate-card {
              width: 100% !important;
              height: 100% !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 10mm !important;
              border-width: 4mm !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              overflow: hidden !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }

            .certificate-logo {
              width: 16mm !important;
              height: 16mm !important;
            }

            .certificate-main-title {
              font-size: 34pt !important;
              line-height: 1 !important;
              margin-top: 4mm !important;
            }

            .certificate-student-name {
              font-size: 28pt !important;
              line-height: 1.1 !important;
              margin-top: 6mm !important;
              padding-bottom: 2mm !important;
            }

            .certificate-course-title {
              font-size: 22pt !important;
              line-height: 1.15 !important;
              margin-top: 4mm !important;
            }

            .certificate-info-row {
              margin-top: 8mm !important;
              gap: 5mm !important;
            }

            .certificate-info-card {
              padding: 4mm 6mm !important;
            }

            .certificate-verified {
              margin-top: 7mm !important;
            }
          }
        `}
      </style>

      <main className="certificate-print-page min-h-screen bg-slate-950 text-white pt-24 px-4 py-10">
        <div className="max-w-5xl mx-auto certificate-print-area">
          <div className="flex justify-between items-center mb-6 print-hidden">
            <Link to="/student/dashboard" className="text-blue-400 font-bold">
              ← Back to Dashboard
            </Link>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Printer size={18} />
              Print / Download
            </button>
          </div>

          <section className="certificate-card bg-white text-slate-950 rounded-[2rem] p-10 md:p-14 border-[12px] border-blue-700 shadow-2xl flex items-center justify-center">
            <div className="text-center w-full">
              <div className="certificate-logo mx-auto h-20 w-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <Award size={42} />
              </div>

              <p className="mt-5 text-sm font-bold tracking-[0.4em] text-blue-700 uppercase">
                Certificate of Completion
              </p>

              <h1 className="certificate-main-title text-4xl md:text-6xl font-black mt-3">
                VeoLMS
              </h1>

              <p className="text-slate-500 mt-4">
                This certificate is proudly presented to
              </p>

              <h2 className="certificate-student-name text-4xl md:text-5xl font-black mt-5 border-b-2 border-slate-300 inline-block px-10 pb-3">
                {certificate.studentName}
              </h2>

              <p className="text-slate-500 mt-7">
                for successfully completing the course
              </p>

              <h3 className="certificate-course-title text-3xl md:text-4xl font-black mt-4 text-blue-700">
                {certificate.courseTitle}
              </h3>

              {certificate.instructorName && (
                <p className="text-slate-600 mt-4">
                  Instructor:{" "}
                  <span className="font-bold">
                    {certificate.instructorName}
                  </span>
                </p>
              )}

              <div className="certificate-info-row mt-8 flex flex-col md:flex-row justify-center gap-5 text-sm">
                <div className="certificate-info-card rounded-2xl bg-slate-100 px-6 py-4">
                  <p className="text-slate-500">Certificate ID</p>
                  <p className="font-black">{certificate.certificateId}</p>
                </div>

                <div className="certificate-info-card rounded-2xl bg-slate-100 px-6 py-4">
                  <p className="text-slate-500">Issued Date</p>
                  <p className="font-black">
                    {formatDate(certificate.issuedAt)}
                  </p>
                </div>

                <div className="certificate-info-card rounded-2xl bg-slate-100 px-6 py-4">
                  <p className="text-slate-500">Lessons Completed</p>
                  <p className="font-black">
                    {certificate.completedLessons}/{certificate.totalLessons}
                  </p>
                </div>
              </div>

              <div className="certificate-verified mt-8 inline-flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle size={22} />
                Verified Certificate
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default CertificatePage;
