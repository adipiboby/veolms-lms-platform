import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CourseReviews from "../components/reviews/CourseReviews";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const getArrayFromResponse = (data, possibleKeys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.enrollments)) return data.data.enrollments;
  if (Array.isArray(data?.data?.courses)) return data.data.courses;

  return [];
};

const getCourseFromEnrollment = (enrollment) => {
  return (
    enrollment?.course ||
    enrollment?.courseId ||
    enrollment?.courseDetails ||
    enrollment?.enrolledCourse ||
    null
  );
};

const getCourseIdFromEnrollment = (enrollment) => {
  const course = getCourseFromEnrollment(enrollment);

  if (course && typeof course === "object") {
    return String(course._id || course.id || "");
  }

  return String(enrollment?.courseId || enrollment?.course || "");
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    return url;
  } catch {
    return url;
  }
};

const getLessons = (course) => {
  if (!Array.isArray(course?.sections)) return [];

  return course.sections.flatMap((section) => {
    if (!Array.isArray(section.lessons)) return [];

    return section.lessons.map((lesson) => ({
      ...lesson,
      sectionTitle: section.title,
    }));
  });
};

const formatPrice = (price) => {
  const numericPrice = Number(price || 0);

  if (numericPrice <= 0) return "Free";

  return `₹${numericPrice.toLocaleString("en-IN")}`;
};

const getCourseDataFromResponse = (data) => {
  return (
    data?.course ||
    data?.data?.course ||
    data?.data ||
    data?.item ||
    data ||
    null
  );
};

const CourseDetailsPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const courseParam = params.slug || params.id || params.courseId;

  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const lessons = useMemo(() => getLessons(course), [course]);

  const totalLessons = lessons.length;

  const totalSections = Array.isArray(course?.sections)
    ? course.sections.length
    : 0;

  const price = Number(course?.price || 0);
  const isFreeCourse = price <= 0;

  const trailerEmbedUrl = getYouTubeEmbedUrl(course?.trailerVideoUrl);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError("");

      let courseRes = null;

      const possibleEndpoints = [
        `/courses/${courseParam}`,
        `/courses/slug/${courseParam}`,
        `/courses/public/${courseParam}`,
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          courseRes = await api.get(endpoint);
          break;
        } catch {
          courseRes = null;
        }
      }

      if (!courseRes) {
        throw new Error("Course not found");
      }

      const loadedCourse = getCourseDataFromResponse(courseRes.data);

      if (!loadedCourse?._id) {
        throw new Error("Invalid course response");
      }

      setCourse(loadedCourse);

      if (
        loadedCourse.isEnrolled ||
        loadedCourse.enrolled ||
        loadedCourse.userEnrolled
      ) {
        setIsEnrolled(true);
      } else {
        await checkEnrollmentStatus(loadedCourse._id);
      }
    } catch (error) {
      console.error("COURSE_DETAILS_FETCH_ERROR:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load course details",
      );
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async (courseId) => {
    if (!courseId || !user) {
      setIsEnrolled(false);
      return;
    }

    try {
      const statusEndpoints = [
        `/enrollments/check/${courseId}`,
        `/enrollments/status/${courseId}`,
        `/enrollments/course/${courseId}/status`,
      ];

      for (const endpoint of statusEndpoints) {
        try {
          const res = await api.get(endpoint);

          const enrolled =
            res.data?.isEnrolled ||
            res.data?.enrolled ||
            res.data?.success === true;

          if (enrolled) {
            setIsEnrolled(true);
            return;
          }
        } catch {
          // Try next endpoint
        }
      }

      const enrollmentEndpoints = [
        "/enrollments/my",
        "/enrollments/my-courses",
        "/enrollments/student",
      ];

      for (const endpoint of enrollmentEndpoints) {
        try {
          const res = await api.get(endpoint);

          const enrollmentList = getArrayFromResponse(res.data, [
            "enrollments",
            "myCourses",
            "courses",
            "items",
          ]);

          const found = enrollmentList.some((enrollment) => {
            const enrolledCourseId = getCourseIdFromEnrollment(enrollment);
            return String(enrolledCourseId) === String(courseId);
          });

          if (found) {
            setIsEnrolled(true);
            return;
          }
        } catch {
          // Try next endpoint
        }
      }

      setIsEnrolled(false);
    } catch {
      setIsEnrolled(false);
    }
  };

  useEffect(() => {
    if (courseParam) {
      fetchCourse();
    }
  }, [courseParam, user?._id, user?.id]);

  const enrollFreeCourse = async () => {
    if (!course?._id) return;

    const possibleEndpoints = [
      "/enrollments",
      "/enrollments/enroll",
      "/enrollments/create",
    ];

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        await api.post(endpoint, {
          courseId: course._id,
        });

        setIsEnrolled(true);
        navigate(`/learn/${course.slug}`);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to enroll course");
  };

  const createPaymentOrder = async () => {
    const possibleEndpoints = [
      "/payments/create-order",
      "/payments/order",
      "/payments/create",
    ];

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        const res = await api.post(endpoint, {
          courseId: course._id,
        });

        return res.data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to create payment order");
  };

  const verifyPayment = async (paymentResponse, orderData) => {
    const possibleEndpoints = ["/payments/verify", "/payments/verify-payment"];

    const payload = {
      courseId: course._id,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      orderId:
        orderData?.order?.id ||
        orderData?.orderId ||
        orderData?.razorpayOrderId ||
        paymentResponse.razorpay_order_id,
    };

    let lastError = null;

    for (const endpoint of possibleEndpoints) {
      try {
        const res = await api.post(endpoint, payload);
        return res.data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Payment verification failed");
  };

  const handlePaidCoursePayment = async () => {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error("Razorpay SDK failed to load");
    }

    const orderData = await createPaymentOrder();

    const razorpayOrder =
      orderData.order || orderData.razorpayOrder || orderData;

    const key =
      orderData.key ||
      orderData.keyId ||
      orderData.razorpayKeyId ||
      import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!key) {
      throw new Error("Razorpay key is missing");
    }

    const options = {
      key,
      amount: razorpayOrder.amount || price * 100,
      currency: razorpayOrder.currency || "INR",
      name: "VeoLMS",
      description: course.title,
      order_id: razorpayOrder.id || orderData.orderId,
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#2563eb",
      },
      handler: async (paymentResponse) => {
        try {
          await verifyPayment(paymentResponse, orderData);

          setIsEnrolled(true);
          navigate(`/learn/${course.slug}`);
        } catch (error) {
          console.error("PAYMENT_VERIFY_ERROR:", error);

          setActionError(
            error.response?.data?.message ||
              error.message ||
              "Payment verification failed",
          );
        }
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handlePrimaryAction = async () => {
    try {
      setActionLoading(true);
      setActionError("");

      if (!user) {
        navigate("/login");
        return;
      }

      if (isEnrolled) {
        navigate(`/learn/${course.slug}`);
        return;
      }

      if (isFreeCourse) {
        await enrollFreeCourse();
        return;
      }

      await handlePaidCoursePayment();
    } catch (error) {
      console.error("COURSE_ACTION_ERROR:", error);

      setActionError(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 pt-28 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          Loading course details...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="mb-3 text-3xl font-black text-red-300">
            Course Not Found
          </h1>

          <p className="mb-6 text-slate-300">{error}</p>

          <Link
            to="/courses"
            className="inline-flex rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            Browse Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pt-24 text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <Link
            to="/courses"
            className="font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Back to Courses
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="aspect-video bg-black">
                {trailerEmbedUrl ? (
                  <iframe
                    src={trailerEmbedUrl}
                    title={course?.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : course?.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    No preview available
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-sm font-bold text-blue-300">
                    {course?.category || "Course"}
                  </span>

                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-sm font-bold text-purple-300">
                    {course?.level || "Beginner"}
                  </span>

                  {isEnrolled && (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1 text-sm font-bold text-green-300">
                      Enrolled
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-black leading-tight md:text-5xl">
                  {course?.title}
                </h1>

                <p className="mt-4 text-lg leading-8 text-slate-300">
                  {course?.shortDescription ||
                    course?.description ||
                    "Learn this course step by step."}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <BookOpen className="mb-3 text-blue-300" size={22} />
                    <p className="text-2xl font-black">{totalSections}</p>
                    <p className="text-sm text-slate-400">Sections</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <PlayCircle className="mb-3 text-purple-300" size={22} />
                    <p className="text-2xl font-black">{totalLessons}</p>
                    <p className="text-sm text-slate-400">Lessons</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <Clock className="mb-3 text-cyan-300" size={22} />
                    <p className="text-2xl font-black">
                      {course?.duration || "Self"}
                    </p>
                    <p className="text-sm text-slate-400">Paced</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <Users className="mb-3 text-green-300" size={22} />
                    <p className="text-2xl font-black">
                      {course?.studentsCount || course?.enrolledCount || 0}
                    </p>
                    <p className="text-sm text-slate-400">Students</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              <h2 className="mb-4 text-2xl font-black">About This Course</h2>

              <p className="whitespace-pre-line leading-8 text-slate-300">
                {course?.description ||
                  course?.shortDescription ||
                  "Course description will be updated soon."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              <h2 className="mb-6 text-2xl font-black">What You Will Get</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <CheckCircle className="shrink-0 text-green-300" size={22} />
                  <p className="text-slate-300">
                    Step-by-step structured learning.
                  </p>
                </div>

                <div className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <CheckCircle className="shrink-0 text-green-300" size={22} />
                  <p className="text-slate-300">
                    Secure video lessons and progress tracking.
                  </p>
                </div>

                <div className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <CheckCircle className="shrink-0 text-green-300" size={22} />
                  <p className="text-slate-300">
                    Completion certificate after finishing the course.
                  </p>
                </div>

                <div className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <CheckCircle className="shrink-0 text-green-300" size={22} />
                  <p className="text-slate-300">
                    Lifetime access after enrollment.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Course Curriculum</h2>
                  <p className="mt-2 text-slate-400">
                    {totalSections} sections • {totalLessons} lessons
                  </p>
                </div>
              </div>

              {course?.sections?.length ? (
                <div className="space-y-4">
                  {course.sections.map((section, sectionIndex) => (
                    <div
                      key={section._id || sectionIndex}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70"
                    >
                      <div className="border-b border-white/10 bg-slate-900/80 px-5 py-4">
                        <h3 className="font-black">
                          {section.title || `Section ${sectionIndex + 1}`}
                        </h3>
                      </div>

                      <div className="divide-y divide-white/10">
                        {section.lessons?.map((lesson, lessonIndex) => (
                          <div
                            key={lesson._id || lessonIndex}
                            className="flex items-center justify-between gap-4 px-5 py-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                                <PlayCircle size={18} />
                              </div>

                              <div>
                                <p className="font-bold text-white">
                                  {lesson.title || `Lesson ${lessonIndex + 1}`}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {lesson.duration || "Video lesson"}
                                </p>
                              </div>
                            </div>

                            {lesson.isPreview ? (
                              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                                Preview
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                                Locked
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-6 text-slate-400">
                  Curriculum will be updated soon.
                </div>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
                  Course Price
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {!isFreeCourse && <IndianRupee size={30} />}
                  <p className="text-4xl font-black">
                    {formatPrice(course?.price)}
                  </p>
                </div>
              </div>

              {actionError && (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {actionError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {actionLoading && (
                  <Loader2 className="animate-spin" size={20} />
                )}

                {isEnrolled
                  ? "Continue Learning"
                  : isFreeCourse
                    ? "Enroll Free"
                    : "Buy Now"}
              </button>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="text-green-300" size={20} />
                  <span>Secure payment and protected videos</span>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <Award className="text-yellow-300" size={20} />
                  <span>Certificate after completion</span>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <Star className="text-blue-300" size={20} />
                  <span>Lifetime access after enrollment</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {course?._id && <CourseReviews courseId={course._id} />}
      </section>
    </main>
  );
};

export default CourseDetailsPage;
