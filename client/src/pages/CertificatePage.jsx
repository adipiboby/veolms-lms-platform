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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="text-center">
          <Loader2
            className="mx-auto animate-spin text-blue-500 dark:text-blue-400"
            size={44}
          />

          <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
            Loading certificate...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pt-28 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 dark:border-red-500/30 dark:bg-red-500/10">
          <h1 className="text-3xl font-black text-red-700 dark:text-red-300">
            Certificate Not Found
          </h1>

          <p className="mt-3 text-slate-700 dark:text-slate-300">{error}</p>

          <Link
            to="/"
            className="mt-6 inline-flex rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
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

            body * {
              visibility: hidden !important;
            }

            .certificate-print-page,
            .certificate-print-page * {
              visibility: visible !important;
            }

            .print-hidden {
              display: none !important;
            }

            .certificate-print-page {
              position: fixed !important;
              inset: 0 !important;
              width: 100% !important;
              height: 100% !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: hidden !important;
              display: flex !important;
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

      <main className="certificate-print-page min-h-screen bg-slate-50 px-4 py-10 pt-24 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <div className="certificate-print-area mx-auto max-w-5xl">
          <div className="print-hidden mb-6 flex items-center justify-between">
            <Link
              to="/student/dashboard"
              className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              <Printer size={18} />
              Print / Download
            </button>
          </div>

          <section className="certificate-card flex items-center justify-center rounded-[2rem] border-[12px] border-blue-700 bg-white p-10 text-slate-950 shadow-2xl md:p-14">
            <div className="w-full text-center">
              <div className="certificate-logo mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Award size={42} />
              </div>

              <p className="mt-5 text-sm font-bold uppercase tracking-[0.4em] text-blue-700">
                Certificate of Completion
              </p>

              <h1 className="certificate-main-title mt-3 text-4xl font-black md:text-6xl">
                VeoLMS
              </h1>

              <p className="mt-4 text-slate-500">
                This certificate is proudly presented to
              </p>

              <h2 className="certificate-student-name mt-5 inline-block border-b-2 border-slate-300 px-10 pb-3 text-4xl font-black md:text-5xl">
                {certificate.studentName}
              </h2>

              <p className="mt-7 text-slate-500">
                for successfully completing the course
              </p>

              <h3 className="certificate-course-title mt-4 text-3xl font-black text-blue-700 md:text-4xl">
                {certificate.courseTitle}
              </h3>

              {certificate.instructorName && (
                <p className="mt-4 text-slate-600">
                  Instructor:{" "}
                  <span className="font-bold">
                    {certificate.instructorName}
                  </span>
                </p>
              )}

              <div className="certificate-info-row mt-8 flex flex-col justify-center gap-5 text-sm md:flex-row">
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

              <div className="certificate-verified mt-8 inline-flex items-center gap-2 font-bold text-green-700">
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
