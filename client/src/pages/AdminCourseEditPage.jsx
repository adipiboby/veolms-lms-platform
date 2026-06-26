import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
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

const createTempId = () => {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
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
        order: Number(lesson?.order ?? lessonIndex + 1),
        isPreview: Boolean(lesson?.isPreview),
        videoUrl: lesson?.videoUrl || lesson?.lessonUrl || "",
        videoKey: lesson?.videoKey || lesson?.fileKey || "",
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
    instructor: courseData?.instructor || "",
    level: courseData?.level || "Beginner",
    price: Number(courseData?.price || 0),
    thumbnail: courseData?.thumbnail || "",
    trailer: courseData?.trailer || "",
    shortDescription:
      courseData?.shortDescription || courseData?.short_description || "",
    description: courseData?.description || "",
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
    instructor: course.instructor,
    level: course.level,
    price: Number(course.price || 0),
    thumbnail: course.thumbnail,
    trailer: course.trailer,
    shortDescription: course.shortDescription,
    description: course.description,
    isPublished: Boolean(course.isPublished),
    sections: normalizeArray(course.sections).map((section, sectionIndex) => ({
      ...section,
      order: Number(section.order || sectionIndex + 1),
      lessons: normalizeArray(section.lessons).map((lesson, lessonIndex) => ({
        ...lesson,
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
  const endpoints = [
    `/courses/${identifier}`,
    `/courses/slug/${identifier}`,
    `/admin/courses/${identifier}`,
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

const tryUpdateCourse = async ({ courseId, payload }) => {
  const requests = [
    () => api.put(`/courses/${courseId}`, payload),
    () => api.patch(`/courses/${courseId}`, payload),
    () => api.put(`/admin/courses/${courseId}`, payload),
    () => api.patch(`/admin/courses/${courseId}`, payload),
  ];

  let lastError = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      const status = error?.response?.status;

      if (![404, 405].includes(status)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  rows = 4,
}) => {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/50"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/50"
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
          [field]: value,
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
              [field]: value,
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
  };

  const removeSection = (sectionIndex) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this section?",
    );

    if (!confirmDelete) return;

    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.filter(
        (_, index) => index !== sectionIndex,
      ),
    }));
  };

  const addLesson = (sectionIndex) => {
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
              order: normalizeArray(section.lessons).length + 1,
              isPreview: false,
              videoUrl: "",
              videoKey: "",
              description: "",
              resources: [],
            },
          ],
        };
      }),
    }));
  };

  const removeLesson = (sectionIndex, lessonIndex) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this lesson?",
    );

    if (!confirmDelete) return;

    setCourse((previousCourse) => ({
      ...previousCourse,
      sections: previousCourse.sections.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          lessons: section.lessons.filter(
            (_, currentLessonIndex) => currentLessonIndex !== lessonIndex,
          ),
        };
      }),
    }));
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

      setCourse(normalizeCourse(loadedCourse));
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
    fetchCourse();
  }, [courseIdentifier]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={26} />
          Loading course edit page...
        </div>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <section className="mx-auto max-w-4xl">
          <Link
            to="/admin/courses"
            className="mb-6 inline-flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to courses
          </Link>

          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
            <div className="flex items-center gap-3 text-red-200">
              <AlertCircle size={28} />
              <h1 className="text-2xl font-black">Course Not Loaded</h1>
            </div>

            <p className="mt-4 text-slate-300">{error}</p>

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
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin/courses"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to courses
            </Link>

            <h1 className="text-3xl font-black md:text-4xl">Edit Course</h1>

            <p className="mt-2 text-slate-400">
              Update course details, lessons, videos, and lesson resources.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {course?.slug && (
              <Link
                to={`/courses/${course.slug}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-200 hover:bg-white/10"
              >
                <Eye size={18} />
                Preview
              </Link>
            )}

            <button
              type="button"
              onClick={handleSaveCourse}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60"
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
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-bold text-green-200">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h2 className="text-2xl font-black">Course Details</h2>
                  <p className="text-sm text-slate-400">
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
                />

                <Field
                  label="Slug"
                  value={course.slug}
                  onChange={(value) => updateCourseField("slug", value)}
                  placeholder="example-course-slug"
                />

                <Field
                  label="Category"
                  value={course.category}
                  onChange={(value) => updateCourseField("category", value)}
                  placeholder="Web Development"
                />

                <Field
                  label="Instructor"
                  value={course.instructor}
                  onChange={(value) => updateCourseField("instructor", value)}
                  placeholder="Instructor name"
                />

                <label className="block">
                  <span className="text-sm font-bold text-slate-300">
                    Level
                  </span>

                  <select
                    value={course.level}
                    onChange={(event) =>
                      updateCourseField("level", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/50"
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
                />

                <Field
                  label="Thumbnail URL"
                  value={course.thumbnail}
                  onChange={(value) => updateCourseField("thumbnail", value)}
                  placeholder="https://..."
                />

                <Field
                  label="Trailer URL"
                  value={course.trailer}
                  onChange={(value) => updateCourseField("trailer", value)}
                  placeholder="https://..."
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
                />

                <Field
                  label="Full Description"
                  value={course.description}
                  onChange={(value) => updateCourseField("description", value)}
                  placeholder="Detailed course description"
                  textarea
                  rows={6}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      course.isPublished
                        ? "bg-green-500/10 text-green-300"
                        : "bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {course.isPublished ? (
                      <Eye size={22} />
                    ) : (
                      <EyeOff size={22} />
                    )}
                  </div>

                  <div>
                    <p className="font-black text-white">Publish Status</p>
                    <p className="text-sm text-slate-400">
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
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300">
                    <Layers size={24} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black">Course Curriculum</h2>
                    <p className="text-sm text-slate-400">
                      Manage sections, lessons, videos, and resources.
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
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-8 text-center">
                  <Layers size={36} className="mx-auto text-slate-500" />
                  <h3 className="mt-4 text-xl font-black">No sections yet</h3>
                  <p className="mt-2 text-slate-400">
                    Add a section to start building the course curriculum.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {course.sections.map((section, sectionIndex) => (
                    <article
                      key={section._id || sectionIndex}
                      className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"
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
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-black text-red-200 hover:bg-red-500/20"
                        >
                          <Trash2 size={18} />
                          Remove
                        </button>
                      </div>

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-black text-white">Lessons</h3>

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
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-slate-400">
                          No lessons in this section.
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {section.lessons.map((lesson, lessonIndex) => {
                            const hasRealLessonId =
                              lesson?._id &&
                              !String(lesson._id).startsWith("temp_");

                            return (
                              <div
                                key={lesson._id || lessonIndex}
                                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                              >
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                                      <Video size={22} />
                                    </div>

                                    <div>
                                      <h4 className="font-black text-white">
                                        Lesson {lessonIndex + 1}
                                      </h4>

                                      <p className="text-sm text-slate-500">
                                        {hasRealLessonId
                                          ? "Saved lesson"
                                          : "New lesson. Save course before uploading resources."}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeLesson(sectionIndex, lessonIndex)
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20"
                                  >
                                    <Trash2 size={16} />
                                    Remove Lesson
                                  </button>
                                </div>

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
                                    placeholder="Example: React Components"
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
                                    placeholder="20:00"
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
                                  />

                                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(lesson.isPreview)}
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

                                    <span className="font-bold text-slate-200">
                                      Free Preview Lesson
                                    </span>
                                  </label>

                                  <Field
                                    label="Video URL"
                                    value={lesson.videoUrl}
                                    onChange={(value) =>
                                      updateLessonField(
                                        sectionIndex,
                                        lessonIndex,
                                        "videoUrl",
                                        value,
                                      )
                                    }
                                    placeholder="https://..."
                                  />

                                  <Field
                                    label="Video Key"
                                    value={lesson.videoKey}
                                    onChange={(value) =>
                                      updateLessonField(
                                        sectionIndex,
                                        lessonIndex,
                                        "videoKey",
                                        value,
                                      )
                                    }
                                    placeholder="course-videos/..."
                                  />
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
                                    <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                                      <div className="flex items-start gap-3">
                                        <FileText
                                          size={22}
                                          className="mt-1 text-yellow-300"
                                        />

                                        <div>
                                          <h4 className="font-black text-yellow-200">
                                            Save course before adding resources
                                          </h4>

                                          <p className="mt-1 text-sm text-slate-300">
                                            New lessons need a real MongoDB
                                            lesson id before PDF, ZIP, DOCX, or
                                            PPT resources can be uploaded.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
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
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-black">Course Summary</h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="text-slate-400">Sections</span>
                  <span className="font-black text-white">
                    {course.sections.length}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="text-slate-400">Lessons</span>
                  <span className="font-black text-white">{totalLessons}</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="text-slate-400">Price</span>
                  <span className="font-black text-white">
                    ₹{Number(course.price || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="text-slate-400">Status</span>
                  <span
                    className={`font-black ${
                      course.isPublished ? "text-green-300" : "text-yellow-300"
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
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60"
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
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <div className="border-b border-white/10 p-4">
                  <div className="flex items-center gap-2 font-black">
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
