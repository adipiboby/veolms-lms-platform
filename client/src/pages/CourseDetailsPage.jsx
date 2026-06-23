import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookOpen, CheckCircle, Clock, PlayCircle, Star } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { loadRazorpayScript } from "../utils/loadRazorpay";

const CourseDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  const lessonsCount = useMemo(() => {
    if (!course?.sections) return 0;

    return course.sections.reduce((total, section) => {
      return total + (section.lessons?.length || 0);
    }, 0);
  }, [course]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setPaymentError("");

        const res = await api.get(`/courses/${slug}`);
        const loadedCourse = res.data.course;

        setCourse(loadedCourse);

        if (isAuthenticated && user?.role === "student") {
          try {
            setCheckingEnrollment(true);

            const statusRes = await api.get(
              `/enrollments/status/${loadedCourse._id}`,
            );

            setIsEnrolled(statusRes.data.isEnrolled);
          } catch (error) {
            console.error("Failed to check enrollment status", error);
          } finally {
            setCheckingEnrollment(false);
          }
        }
      } catch (error) {
        console.error(error);
        setPaymentError(
          error.response?.data?.message || "Failed to load course",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug, isAuthenticated, user?.role]);

  const handleBuyCourse = async () => {
    try {
      setPaymentError("");

      if (!isAuthenticated) {
        navigate("/login");
        return;
      }

      if (user?.role !== "student") {
        setPaymentError("Only students can purchase courses.");
        return;
      }

      setPaymentLoading(true);

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setPaymentError("Failed to load Razorpay. Please try again.");
        return;
      }

      const orderRes = await api.post("/payments/create-order", {
        courseId: course._id,
      });

      const { key, order } = orderRes.data;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "VeoLMS",
        description: course.title,
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setIsEnrolled(true);
            navigate(`/learn/${course.slug}`);
          } catch (error) {
            setPaymentError(
              error.response?.data?.message || "Payment verification failed",
            );
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setPaymentError(
        error.response?.data?.message || "Failed to start payment",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pt-28 px-4">
        <p className="text-slate-400">Loading course...</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pt-28 px-4">
        <p className="text-red-300">Course not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pt-24">
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <Link
              to="/courses"
              className="text-blue-400 font-semibold hover:text-blue-300"
            >
              ← Back to Courses
            </Link>

            <div className="mt-8">
              <div className="flex flex-wrap gap-3 mb-5">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-sm font-bold border border-blue-500/20">
                  {course.category}
                </span>

                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-sm font-bold border border-purple-500/20">
                  {course.level}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
                {course.title}
              </h1>

              <p className="text-xl text-slate-300 leading-relaxed mb-6">
                {course.shortDescription}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-300" />
                  <span>4.8 rating</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen size={18} />
                  <span>{lessonsCount} lessons</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  <span>Lifetime access</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden mb-8">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-[360px] object-cover"
                />
              </div>

              {paymentError && (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
                  {paymentError}
                </div>
              )}

              <div className="mb-10">
                {isEnrolled ? (
                  <Link
                    to={`/learn/${course.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
                  >
                    Continue Learning
                    <PlayCircle size={20} />
                  </Link>
                ) : (
                  <button
                    onClick={handleBuyCourse}
                    disabled={paymentLoading || checkingEnrollment}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {paymentLoading
                      ? "Processing..."
                      : checkingEnrollment
                        ? "Checking..."
                        : `Buy Now ₹${course.price}`}
                  </button>
                )}
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-6 mb-8">
                <h2 className="text-2xl font-black mb-4">About this course</h2>

                <p className="text-slate-300 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <h2 className="text-2xl font-black mb-5">Course Curriculum</h2>

                <div className="space-y-4">
                  {course.sections?.map((section) => (
                    <div
                      key={section._id}
                      className="rounded-2xl bg-slate-950 border border-white/10 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-white/10">
                        <h3 className="font-black">{section.title}</h3>
                      </div>

                      <div className="p-4 space-y-3">
                        {section.lessons?.map((lesson) => (
                          <div
                            key={lesson._id}
                            className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle
                                size={18}
                                className="text-slate-500"
                              />

                              <div>
                                <p className="font-bold">{lesson.title}</p>
                                <p className="text-sm text-slate-400">
                                  {lesson.duration}
                                </p>
                              </div>
                            </div>

                            {lesson.isPreview && (
                              <span className="text-xs font-bold text-blue-300">
                                Preview
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 h-fit rounded-3xl bg-white/5 border border-white/10 p-6">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-48 object-cover rounded-2xl mb-5"
            />

            <h2 className="text-4xl font-black mb-2">₹{course.price}</h2>

            <p className="text-slate-400 mb-6">
              Full lifetime access to this course.
            </p>

            {isEnrolled ? (
              <Link
                to={`/learn/${course.slug}`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 mb-4"
              >
                Continue Learning
                <PlayCircle size={20} />
              </Link>
            ) : (
              <button
                onClick={handleBuyCourse}
                disabled={paymentLoading || checkingEnrollment}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mb-4 disabled:opacity-60"
              >
                {paymentLoading
                  ? "Processing..."
                  : checkingEnrollment
                    ? "Checking..."
                    : "Buy Course"}
              </button>
            )}

            <div className="space-y-3 text-sm text-slate-300">
              <p>✅ {lessonsCount} lessons</p>
              <p>✅ Lifetime access</p>
              <p>✅ Secure payment</p>
              <p>✅ Progress tracking</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default CourseDetailsPage;
