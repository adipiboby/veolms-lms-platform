import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  FileVideo,
  Image,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";

import { api } from "../services/api";
import LessonResourceManager from "../components/admin/LessonResourceManager";
import VideoUploadField from "../components/admin/VideoUploadField";

const createTempId = () => {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const normalizeObjectId = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value._id || null;
  }

  return String(value);
};

const normalizeCourse = (courseData) => {
  const sections = normalizeArray(courseData?.sections).map(
    (section, sectionIndex) => ({
      ...section,
      _id: section?._id || createTempId(),
      title: section?.title || "",
      order: Number(section?.order ?? sectionIndex + 1),
      lessons: normalizeArray(section?.lessons).map((lesson, lessonIndex) => ({
        ...lesson,
        _id: lesson?._id || createTempId(),
        title: lesson?.title || "",
        duration: lesson?.duration || "",
        durationSeconds: Number(lesson?.durationSeconds || 0),
        order: Number(lesson?.order ?? lessonIndex + 1),
        isPreview: Boolean(lesson?.isPreview),
        videoUrl: lesson?.videoUrl || lesson?.lessonUrl || "",
        videoKey: lesson?.videoKey || lesson?.fileKey || lesson?.videoUrl || "",
        videoAssetId: normalizeObjectId(lesson?.videoAssetId),
        hlsManifestKey: lesson?.hlsManifestKey || "",
        hlsOutputPrefix: lesson?.hlsOutputPrefix || "",
        originalVideoName: lesson?.originalVideoName || "",
        sizeBytes: Number(lesson?.sizeBytes || 0),
        mimeType: lesson?.mimeType || "",
        description: lesson?.description || "",
        resources: normalizeArray(lesson?.resources),
      })),
    }),
  );

  return {
    ...courseData,
    title: courseData?.title || "",
    slug: courseData?.slug || "",
    category: courseData?.category || "",
    instructorName: courseData?.instructorName || courseData?.instructor || "",
    level: courseData?.level || "Beginner",
    price: Number(courseData?.price || 0),
    thumbnail: courseData?.thumbnail || "",
    trailerVideoUrl: courseData?.trailerVideoUrl || courseData?.trailer || "",
    shortDescription:
      courseData?.shortDescription || courseData?.short_description || "",
    description: courseData?.description || "",
    isFeatured: Boolean(courseData?.isFeatured),
    isPublished: Boolean(courseData?.isPublished ?? courseData?.published),
    sections,
  };
};

const removeTempIds = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeTempIds);
  }

  if (value && typeof value === "object") {
    const cleaned = {};

    Object.entries(value).forEach(([key, itemValue]) => {
      if (key === "_id" && String(itemValue).startsWith("temp_")) {
        return;
      }

      cleaned[key] = removeTempIds(itemValue);
    });

    return cleaned;
  }

  return value;
};

const buildCoursePayload = (course) => {
  const payload = {
    title: course.title,
    slug: course.slug,
    category: course.category,
    instructorName: course.instructorName,
    instructor: course.instructorName,
    level: course.level,
    price: Number(course.price || 0),
    thumbnail: course.thumbnail,
    trailerVideoUrl: course.trailerVideoUrl,
    trailer: course.trailerVideoUrl,
    shortDescription: course.shortDescription,
    description: course.description,
    isFeatured: Boolean(course.isFeatured),
    isPublished: Boolean(course.isPublished),
    sections: normalizeArray(course.sections).map((section, sectionIndex) => ({
      ...section,
      title: section.title,
      order: Number(section.order || sectionIndex + 1),
      lessons: normalizeArray(section.lessons).map((lesson, lessonIndex) => ({
        ...lesson,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        videoKey: lesson.videoKey || lesson.videoUrl || "",
        videoAssetId: normalizeObjectId(lesson.videoAssetId),
        hlsManifestKey: lesson.hlsManifestKey || "",
        hlsOutputPrefix: lesson.hlsOutputPrefix || "",
        duration: lesson.duration || "",
        durationSeconds: Number(lesson.durationSeconds || 0),
        originalVideoName: lesson.originalVideoName || "",
        sizeBytes: Number(lesson.sizeBytes || 0),
        mimeType: lesson.mimeType || "",
        description: lesson.description || "",
        order: Number(lesson.order || lessonIndex + 1),
        isPreview: Boolean(lesson.isPreview),
        resources: normalizeArray(lesson.resources),
      })),
    })),
  };

  return removeTempIds(payload);
};

const getCourseFromResponse = (response) => {
  return (
    response?.data?.course ||
    response?.data?.data?.course ||
    response?.data?.data ||
    response?.data ||
    null
  );
};

const tryGetCourse = async (identifier) => {
  return api.get(`/courses/admin/${identifier}`);
};

const tryUpdateCourse = async ({ courseId, payload }) => {
  try {
    return await api.put(`/courses/admin/${courseId}`, payload);
  } catch (putError) {
    const status = putError?.response?.status;

    if (status === 404 || status === 405) {
      return await api.patch(`/courses/admin/${courseId}`, payload);
    }

    throw putError;
  }
};

const formatSizeMB = (sizeBytes) => {
  const size = Number(sizeBytes || 0);

  if (size <= 0) return "";

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400/50";

const labelClass = "text-sm font-bold text-slate-700 dark:text-slate-300";

const cardClass =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20";

const innerCardClass =
  "rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/50";

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  rows = 4,
  required = false,
}) => {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className={`${fieldClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
    </label>
  );
};

const AdminCourseEditPage = () => {
  const params = useParams();
  const navigate = useNavigate();

  const courseIdentifier =
    params.id || params.courseId || params.slug || params.courseSlug;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [highlightedLessonKey, setHighlightedLessonKey] = useState("");
  const [openLessonKey, setOpenLessonKey] = useState("");

  const lessonRefs = useRef({});
  const toastTimerRef = useRef(null);
  const highlightTimerRef = useRef(null);

  const getLessonRefKey = (sectionIndex, lessonIndex) => {
    return `${sectionIndex}-${lessonIndex}`;
  };

  const showToast = (text) => {
    setToast(text);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const scrollToLesson = (sectionIndex, lessonIndex) => {
    window.setTimeout(() => {
      const key = getLessonRefKey(sectionIndex, lessonIndex);
      const element = lessonRefs.current[key];

      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);
  };

  const highlightLesson = (sectionIndex, lessonIndex) => {
    const key = getLessonRefKey(sectionIndex, lessonIndex);

    setHighlightedLessonKey(key);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedLessonKey("");
    }, 2500);
  };

  const toggleLesson = (sectionIndex, lessonIndex) => {
    const key = getLessonRefKey(sectionIndex, lessonIndex);

    setOpenLessonKey((currentKey) => {
      const nextKey = currentKey === key ? "" : key;

      if (nextKey) {
        scrollToLesson(sectionIndex, lessonIndex);
      }

      return nextKey;
    });
  };

  const totalLessons = useMemo(() => {
    return normalizeArray(course?.sections).reduce((total, section) => {
      return total + normalizeArray(section.lessons).length;
    }, 0);
  }, [course]);

  const updateCourseField = (field, value) => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      [field]: value,
    }));

    setMessage("");
    setError("");
  };

  const updateSectionField = (sectionIndex, field, value) => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          [field]: field === "order" ? Number(value) : value,
        };
      }),
    }));

    setMessage("");
    setError("");
  };

  const updateLessonField = (sectionIndex, lessonIndex, field, value) => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          lessons: section.lessons.map((lesson, currentLessonIndex) => {
            if (currentLessonIndex !== lessonIndex) return lesson;

            return {
              ...lesson,
              [field]:
                field === "order"
                  ? Number(value)
                  : field === "isPreview"
                    ? Boolean(value)
                    : value,
            };
          }),
        };
      }),
    }));

    setMessage("");
    setError("");
  };

  const handleLessonVideoMeta = (sectionIndex, lessonIndex, metadata) => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          lessons: section.lessons.map((lesson, currentLessonIndex) => {
            if (currentLessonIndex !== lessonIndex) return lesson;

            return {
              ...lesson,
              title: lesson.title?.trim()
                ? lesson.title
                : metadata.title || lesson.title,
              duration: metadata.duration || lesson.duration,
              durationSeconds:
                metadata.durationSeconds || lesson.durationSeconds || 0,
              originalVideoName:
                metadata.originalVideoName || lesson.originalVideoName || "",
              sizeBytes: metadata.sizeBytes || lesson.sizeBytes || 0,
              mimeType: metadata.mimeType || lesson.mimeType || "",
              videoKey: metadata.videoKey || lesson.videoKey || "",
              videoUrl: metadata.videoUrl || lesson.videoUrl || "",
              videoAssetId:
                metadata.videoAssetId || lesson.videoAssetId || null,
              hlsManifestKey:
                metadata.hlsManifestKey || lesson.hlsManifestKey || "",
              hlsOutputPrefix:
                metadata.hlsOutputPrefix || lesson.hlsOutputPrefix || "",
            };
          }),
        };
      }),
    }));

    setMessage("");
    setError("");
  };

  const updateLessonResources = (lessonId, nextResources) => {
    setCourse((previousCourse) => {
      if (!previousCourse) return previousCourse;

      return {
        ...previousCourse,
        sections: previousCourse.sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) => {
            if (String(lesson._id) !== String(lessonId)) {
              return lesson;
            }

            return {
              ...lesson,
              resources: nextResources,
            };
          }),
        })),
      };
    });
  };

  const addSection = () => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: [
        ...normalizeArray(previousCourse.sections),
        {
          _id: createTempId(),
          title: "",
          order: normalizeArray(previousCourse.sections).length + 1,
          lessons: [],
        },
      ],
    }));

    showToast("Section added successfully.");
  };

  const removeSection = (sectionIndex) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this section?",
    );

    if (!confirmDelete) return;

    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections
        .filter((_, index) => index !== sectionIndex)
        .map((section, index) => ({
          ...section,
          order: index + 1,
        })),
    }));

    showToast("Section removed.");
  };

  const addLesson = (sectionIndex) => {
    const nextLessonIndex = normalizeArray(
      course?.sections?.[sectionIndex]?.lessons,
    ).length;

    const newLessonKey = getLessonRefKey(sectionIndex, nextLessonIndex);

    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          lessons: [
            ...normalizeArray(section.lessons),
            {
              _id: createTempId(),
              title: "",
              duration: "",
              durationSeconds: 0,
              order: normalizeArray(section.lessons).length + 1,
              isPreview: false,
              videoUrl: "",
              videoKey: "",
              videoAssetId: null,
              hlsManifestKey: "",
              hlsOutputPrefix: "",
              originalVideoName: "",
              sizeBytes: 0,
              mimeType: "",
              description: "",
              resources: [],
            },
          ],
        };
      }),
    }));

    setOpenLessonKey(newLessonKey);
    showToast(`Lesson ${nextLessonIndex + 1} added successfully.`);
    scrollToLesson(sectionIndex, nextLessonIndex);
    highlightLesson(sectionIndex, nextLessonIndex);
  };

  const removeLesson = (sectionIndex, lessonIndex) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this lesson?",
    );

    if (!confirmDelete) return;

    const removedLessonKey = getLessonRefKey(sectionIndex, lessonIndex);

    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          lessons: section.lessons
            .filter(
              (_, currentLessonIndex) => currentLessonIndex !== lessonIndex,
            )
            .map((lesson, currentIndex) => ({
              ...lesson,
              order: currentIndex + 1,
            })),
        };
      }),
    }));

    if (openLessonKey === removedLessonKey) {
      setOpenLessonKey("");
    }

    showToast("Lesson removed.");
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (!courseIdentifier) {
        throw new Error("Course id is missing from URL.");
      }

      const response = await tryGetCourse(courseIdentifier);
      const loadedCourse = getCourseFromResponse(response);

      if (!loadedCourse?._id) {
        throw new Error("Course not found.");
      }

      const normalizedCourse = normalizeCourse(loadedCourse);

      setCourse(normalizedCourse);
      setOpenLessonKey("");
    } catch (fetchError) {
      console.error("ADMIN_COURSE_EDIT_FETCH_ERROR:", fetchError);

      setError(
        fetchError?.response?.data?.message ||
          fetchError?.message ||
          "Unable to load course.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!course?._id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = buildCoursePayload(course);

      const response = await tryUpdateCourse({
        courseId: course._id,
        payload,
      });

      const savedCourse = getCourseFromResponse(response);

      if (savedCourse?._id) {
        setCourse(normalizeCourse(savedCourse));
      }

      setMessage("Course updated successfully.");
      showToast("Course saved successfully.");
    } catch (saveError) {
      console.error("ADMIN_COURSE_EDIT_SAVE_ERROR:", saveError);

      setError(
        saveError?.response?.data?.message ||
          "Unable to save course. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchCourse();
  }, [courseIdentifier]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2
            className="animate-spin text-blue-500 dark:text-blue-400"
            size={26}
          />
          Loading course edit page...
        </div>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="mx-auto max-w-4xl">
          <Link
            to="/admin/courses"
            className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to courses
          </Link>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-200">
              <AlertCircle size={28} />
              <h1 className="text-2xl font-black">Course Not Loaded</h1>
            </div>

            <p className="mt-4 text-slate-700 dark:text-slate-300">{error}</p>

            <button
              type="button"
              onClick={fetchCourse}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {toast && (
        <div className="fixed right-5 top-5 z-[999] rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-black text-green-700 shadow-2xl backdrop-blur dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
          {toast}
        </div>
      )}

      <section className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin/courses"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to courses
            </Link>

            <h1 className="text-3xl font-black text-slate-950 md:text-4xl dark:text-white">
              Edit Course
            </h1>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Lessons are shown like Lesson 1, Lesson 2. Click a lesson to edit
              its full details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {course?.slug && (
              <Link
                to={`/courses/${course.slug}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <Eye size={18} />
                Preview
              </Link>
            )}

            <button
              type="button"
              onClick={handleSaveCourse}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? "Saving..." : "Save Course"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className={cardClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    Course Details
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Main information shown to students.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Course Title"
                  value={course.title}
                  onChange={(value) => updateCourseField("title", value)}
                  placeholder="Example: Full Stack LMS Course"
                  required
                />

                <Field
                  label="Slug"
                  value={course.slug}
                  onChange={(value) => updateCourseField("slug", value)}
                  placeholder="example-course-slug"
                  required
                />

                <Field
                  label="Category"
                  value={course.category}
                  onChange={(value) => updateCourseField("category", value)}
                  placeholder="Web Development"
                  required
                />

                <Field
                  label="Instructor Name"
                  value={course.instructorName}
                  onChange={(value) =>
                    updateCourseField("instructorName", value)
                  }
                  placeholder="Instructor name"
                  required
                />

                <label className="block">
                  <span className={labelClass}>Level</span>

                  <select
                    value={course.level}
                    onChange={(event) =>
                      updateCourseField("level", event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>

                <Field
                  label="Price"
                  type="number"
                  value={course.price}
                  onChange={(value) => updateCourseField("price", value)}
                  placeholder="899"
                  required
                />

                <Field
                  label="Thumbnail URL"
                  value={course.thumbnail}
                  onChange={(value) => updateCourseField("thumbnail", value)}
                  placeholder="https://..."
                  required
                />

                <Field
                  label="Trailer Video URL"
                  value={course.trailerVideoUrl}
                  onChange={(value) =>
                    updateCourseField("trailerVideoUrl", value)
                  }
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="mt-5 grid gap-5">
                <Field
                  label="Short Description"
                  value={course.shortDescription}
                  onChange={(value) =>
                    updateCourseField("shortDescription", value)
                  }
                  placeholder="Short course summary"
                  textarea
                  rows={3}
                  required
                />

                <Field
                  label="Full Description"
                  value={course.description}
                  onChange={(value) => updateCourseField("description", value)}
                  placeholder="Detailed course description"
                  textarea
                  rows={6}
                  required
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <input
                    type="checkbox"
                    checked={Boolean(course.isFeatured)}
                    onChange={(event) =>
                      updateCourseField("isFeatured", event.target.checked)
                    }
                    className="h-5 w-5 accent-blue-600"
                  />

                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Featured Course
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        course.isPublished
                          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300"
                      }`}
                    >
                      {course.isPublished ? (
                        <Eye size={22} />
                      ) : (
                        <EyeOff size={22} />
                      )}
                    </div>

                    <div>
                      <p className="font-black text-slate-950 dark:text-white">
                        Publish Status
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Published courses are visible to students.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateCourseField("isPublished", !course.isPublished)
                    }
                    className={`rounded-2xl px-5 py-3 font-black ${
                      course.isPublished
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </button>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                    <Layers size={24} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                      Course Curriculum
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Click each lesson row to open or close its full details.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-black text-white hover:bg-purple-700"
                >
                  <Plus size={18} />
                  Add Section
                </button>
              </div>

              {normalizeArray(course.sections).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-slate-950/50">
                  <Layers
                    size={36}
                    className="mx-auto text-slate-400 dark:text-slate-500"
                  />
                  <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                    No sections yet
                  </h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Add a section to start building the course curriculum.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {course.sections.map((section, sectionIndex) => (
                    <article
                      key={section._id || sectionIndex}
                      className={innerCardClass}
                    >
                      <div className="mb-5 flex flex-wrap items-end gap-4">
                        <div className="min-w-[220px] flex-1">
                          <Field
                            label={`Section ${sectionIndex + 1} Title`}
                            value={section.title}
                            onChange={(value) =>
                              updateSectionField(sectionIndex, "title", value)
                            }
                            placeholder="Example: Getting Started"
                            required
                          />
                        </div>

                        <div className="w-28">
                          <Field
                            label="Order"
                            type="number"
                            value={section.order}
                            onChange={(value) =>
                              updateSectionField(sectionIndex, "order", value)
                            }
                            placeholder="1"
                            required
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-black text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                        >
                          <Trash2 size={18} />
                          Remove
                        </button>
                      </div>

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-black text-slate-950 dark:text-white">
                          Lessons
                        </h3>

                        <button
                          type="button"
                          onClick={() => addLesson(sectionIndex)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
                        >
                          <Plus size={16} />
                          Add Lesson
                        </button>
                      </div>

                      {normalizeArray(section.lessons).length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                          No lessons in this section.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {section.lessons.map((lesson, lessonIndex) => {
                            const lessonKey = getLessonRefKey(
                              sectionIndex,
                              lessonIndex,
                            );
                            const isOpen = openLessonKey === lessonKey;
                            const hasRealLessonId =
                              lesson?._id &&
                              !String(lesson._id).startsWith("temp_");

                            return (
                              <div
                                key={lesson._id || lessonIndex}
                                ref={(element) => {
                                  if (element) {
                                    lessonRefs.current[lessonKey] = element;
                                  }
                                }}
                                className={`scroll-mt-28 overflow-hidden rounded-3xl border transition-all duration-300 ${
                                  highlightedLessonKey === lessonKey
                                    ? "border-green-300 bg-green-50 ring-2 ring-green-200 dark:border-green-400/60 dark:bg-green-500/10 dark:ring-green-400/20"
                                    : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleLesson(sectionIndex, lessonIndex)
                                  }
                                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                      <Video size={22} />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-black text-slate-950 dark:text-white">
                                          Lesson {lessonIndex + 1}
                                        </h4>

                                        {lesson.isPreview && (
                                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                                            Preview
                                          </span>
                                        )}

                                        {lesson.videoUrl ? (
                                          <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-black text-green-700 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-200">
                                            Video Added
                                          </span>
                                        ) : (
                                          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[11px] font-black text-yellow-700 dark:border-yellow-400/20 dark:bg-yellow-500/10 dark:text-yellow-200">
                                            No Video
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                                        {lesson.title?.trim() ||
                                          "Click to add lesson details"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {lesson.duration && (
                                      <span className="hidden items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 sm:inline-flex">
                                        <Clock size={14} />
                                        {lesson.duration}
                                      </span>
                                    )}

                                    {isOpen ? (
                                      <ChevronDown
                                        size={22}
                                        className="text-slate-500 dark:text-slate-300"
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={22}
                                        className="text-slate-500 dark:text-slate-300"
                                      />
                                    )}
                                  </div>
                                </button>

                                {isOpen && (
                                  <div className="border-t border-slate-200 p-5 dark:border-white/10">
                                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="font-black text-slate-950 dark:text-white">
                                          Lesson {lessonIndex + 1} Details
                                        </p>

                                        <p className="text-sm text-slate-500">
                                          {hasRealLessonId
                                            ? "Saved lesson"
                                            : "New lesson. Save course before uploading resources."}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeLesson(
                                            sectionIndex,
                                            lessonIndex,
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                      >
                                        <Trash2 size={16} />
                                        Remove Lesson
                                      </button>
                                    </div>

                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                                      <div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                          <Field
                                            label="Lesson Title"
                                            value={lesson.title}
                                            onChange={(value) =>
                                              updateLessonField(
                                                sectionIndex,
                                                lessonIndex,
                                                "title",
                                                value,
                                              )
                                            }
                                            placeholder="Auto-filled from video name"
                                            required
                                          />

                                          <Field
                                            label="Duration"
                                            value={lesson.duration}
                                            onChange={(value) =>
                                              updateLessonField(
                                                sectionIndex,
                                                lessonIndex,
                                                "duration",
                                                value,
                                              )
                                            }
                                            placeholder="Auto-filled"
                                          />

                                          <Field
                                            label="Order"
                                            type="number"
                                            value={lesson.order}
                                            onChange={(value) =>
                                              updateLessonField(
                                                sectionIndex,
                                                lessonIndex,
                                                "order",
                                                value,
                                              )
                                            }
                                            placeholder="1"
                                            required
                                          />

                                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(
                                                lesson.isPreview,
                                              )}
                                              onChange={(event) =>
                                                updateLessonField(
                                                  sectionIndex,
                                                  lessonIndex,
                                                  "isPreview",
                                                  event.target.checked,
                                                )
                                              }
                                              className="h-5 w-5 accent-blue-600"
                                            />

                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              Free Preview Lesson
                                            </span>
                                          </label>
                                        </div>

                                        <div className="mt-4">
                                          <Field
                                            label="Lesson Description"
                                            value={lesson.description}
                                            onChange={(value) =>
                                              updateLessonField(
                                                sectionIndex,
                                                lessonIndex,
                                                "description",
                                                value,
                                              )
                                            }
                                            placeholder="Lesson details..."
                                            textarea
                                            rows={3}
                                          />
                                        </div>

                                        {(lesson.duration ||
                                          lesson.originalVideoName ||
                                          lesson.sizeBytes > 0 ||
                                          lesson.mimeType ||
                                          lesson.videoKey) && (
                                          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                                            <p className="mb-3 flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-200">
                                              <FileVideo size={16} />
                                              Saved Video Metadata
                                            </p>

                                            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                              {lesson.duration && (
                                                <p className="flex items-center gap-2">
                                                  <Clock size={14} />
                                                  Duration: {lesson.duration}
                                                </p>
                                              )}

                                              {lesson.originalVideoName && (
                                                <p className="break-all">
                                                  File:{" "}
                                                  {lesson.originalVideoName}
                                                </p>
                                              )}

                                              {lesson.sizeBytes > 0 && (
                                                <p>
                                                  Size:{" "}
                                                  {formatSizeMB(
                                                    lesson.sizeBytes,
                                                  )}
                                                </p>
                                              )}

                                              {lesson.mimeType && (
                                                <p>Type: {lesson.mimeType}</p>
                                              )}

                                              {lesson.videoKey && (
                                                <p className="break-all">
                                                  Video Key: {lesson.videoKey}
                                                </p>
                                              )}

                                              {lesson.hlsManifestKey && (
                                                <p className="break-all">
                                                  HLS: {lesson.hlsManifestKey}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div>
                                        <label
                                          className={`mb-2 block ${labelClass}`}
                                        >
                                          Lesson Video
                                        </label>

                                        <VideoUploadField
                                          value={lesson.videoUrl}
                                          courseSlug={
                                            course.slug ||
                                            course.title ||
                                            "course"
                                          }
                                          courseId={course._id}
                                          lessonId={
                                            hasRealLessonId
                                              ? lesson._id
                                              : undefined
                                          }
                                          onMetaChange={(metadata) => {
                                            handleLessonVideoMeta(
                                              sectionIndex,
                                              lessonIndex,
                                              metadata,
                                            );
                                          }}
                                          onChange={(uploadedVideoSource) => {
                                            updateLessonField(
                                              sectionIndex,
                                              lessonIndex,
                                              "videoUrl",
                                              uploadedVideoSource,
                                            );
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-5">
                                      {hasRealLessonId ? (
                                        <LessonResourceManager
                                          courseId={course._id}
                                          lesson={lesson}
                                          resources={lesson.resources || []}
                                          onResourcesChange={(nextResources) =>
                                            updateLessonResources(
                                              lesson._id,
                                              nextResources,
                                            )
                                          }
                                        />
                                      ) : (
                                        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-500/20 dark:bg-yellow-500/10">
                                          <div className="flex items-start gap-3">
                                            <FileText
                                              size={22}
                                              className="mt-1 text-yellow-700 dark:text-yellow-300"
                                            />

                                            <div>
                                              <h4 className="font-black text-yellow-800 dark:text-yellow-200">
                                                Save course before adding
                                                resources
                                              </h4>

                                              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                                New lessons need a real MongoDB
                                                lesson id before PDF, ZIP, DOCX,
                                                or PPT resources can be
                                                uploaded.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">
                Course Summary
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <span className="text-slate-600 dark:text-slate-400">
                    Sections
                  </span>
                  <span className="font-black text-slate-950 dark:text-white">
                    {course.sections.length}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <span className="text-slate-600 dark:text-slate-400">
                    Lessons
                  </span>
                  <span className="font-black text-slate-950 dark:text-white">
                    {totalLessons}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <span className="text-slate-600 dark:text-slate-400">
                    Price
                  </span>
                  <span className="font-black text-slate-950 dark:text-white">
                    ₹{Number(course.price || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                  <span className="text-slate-600 dark:text-slate-400">
                    Status
                  </span>
                  <span
                    className={`font-black ${
                      course.isPublished
                        ? "text-green-700 dark:text-green-300"
                        : "text-yellow-700 dark:text-yellow-300"
                    }`}
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCourse}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </section>

            {course.thumbnail && (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
                <div className="border-b border-slate-200 p-4 dark:border-white/10">
                  <div className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
                    <Image size={18} />
                    Thumbnail Preview
                  </div>
                </div>

                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="aspect-video w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
};

export default AdminCourseEditPage;
