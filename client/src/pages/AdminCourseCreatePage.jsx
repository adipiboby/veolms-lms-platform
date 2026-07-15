import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  FileVideo,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { api } from "../services/api";
import VideoUploadField from "../components/admin/VideoUploadField";

const DEFAULT_THUMBNAIL_URL =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";

const DEFAULT_TRAILER_VIDEO_URL = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

const createClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const createEmptyLesson = (order = 1) => ({
  clientId: createClientId(),
  title: "",
  videoUrl: "",
  videoKey: "",
  videoAssetId: null,
  hlsManifestKey: "",
  hlsOutputPrefix: "",
  duration: "",
  durationSeconds: 0,
  originalVideoName: "",
  sizeBytes: 0,
  mimeType: "",
  isPreview: false,
  order,
  description: "",
  resources: [],
});

const createEmptySection = (order = 1) => ({
  clientId: createClientId(),
  title: "",
  order,
  lessons: [createEmptyLesson(1)],
});

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20";

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
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

const preserveClientIdsAfterSave = ({ previousCourse, savedCourse }) => {
  return {
    ...savedCourse,

    sections: normalizeArray(savedCourse?.sections).map(
      (section, sectionIndex) => {
        const previousSection = previousCourse?.sections?.[sectionIndex];

        return {
          ...section,
          clientId:
            previousSection?.clientId || section?.clientId || createClientId(),

          lessons: normalizeArray(section?.lessons).map(
            (lesson, lessonIndex) => {
              const previousLesson = previousSection?.lessons?.[lessonIndex];

              return {
                ...lesson,
                clientId:
                  previousLesson?.clientId ||
                  lesson?.clientId ||
                  createClientId(),
              };
            },
          ),
        };
      },
    ),
  };
};

const cleanTitleFromVideo = (metadata = {}, fallback = "Lesson Video") => {
  return String(
    metadata.title ||
      metadata.displayTitle ||
      metadata.originalVideoName ||
      metadata.fileName ||
      fallback,
  )
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const buildSavableCoursePayload = ({
  formData,
  sectionIndexForVideo = -1,
  lessonIndexForVideo = -1,
  metadata = {},
}) => {
  const safeCourseTitle =
    String(formData.title || "").trim() || `New Course ${Date.now()}`;
  const safeCategory = String(formData.category || "").trim() || "General";
  const safeInstructor =
    String(formData.instructorName || "").trim() || "VeoLMS Instructor";
  const safeShortDescription =
    String(formData.shortDescription || "").trim() ||
    `Learn ${safeCourseTitle} with structured video lessons.`;
  const safeDescription =
    String(formData.description || "").trim() ||
    `${safeCourseTitle} includes organized sections, lessons, videos, and resources.`;
  const safeThumbnail =
    String(formData.thumbnail || "").trim() || DEFAULT_THUMBNAIL_URL;
  const safeTrailer =
    String(formData.trailerVideoUrl || "").trim() || DEFAULT_TRAILER_VIDEO_URL;

  const sections = normalizeArray(formData.sections).map(
    (section, currentSectionIndex) => {
      const safeSectionTitle =
        String(section?.title || "").trim() ||
        `Section ${currentSectionIndex + 1}`;

      const lessons = normalizeArray(section?.lessons).map(
        (lesson, currentLessonIndex) => {
          const isTargetLesson =
            currentSectionIndex === sectionIndexForVideo &&
            currentLessonIndex === lessonIndexForVideo;

          const autoLessonTitle = cleanTitleFromVideo(
            metadata,
            `Lesson ${currentLessonIndex + 1}`,
          );

          return {
            ...lesson,
            title:
              String(lesson?.title || "").trim() ||
              (isTargetLesson ? autoLessonTitle : "") ||
              `Lesson ${currentLessonIndex + 1}`,
            videoUrl: lesson?.videoUrl || "",
            videoKey: lesson?.videoKey || lesson?.videoUrl || "",
            videoAssetId: lesson?.videoAssetId || null,
            hlsManifestKey: lesson?.hlsManifestKey || "",
            hlsOutputPrefix: lesson?.hlsOutputPrefix || "",
            duration:
              (isTargetLesson && metadata.duration) || lesson?.duration || "",
            durationSeconds: Number(
              (isTargetLesson && metadata.durationSeconds) ||
                lesson?.durationSeconds ||
                0,
            ),
            originalVideoName:
              (isTargetLesson && metadata.originalVideoName) ||
              lesson?.originalVideoName ||
              "",
            sizeBytes: Number(
              (isTargetLesson && metadata.sizeBytes) || lesson?.sizeBytes || 0,
            ),
            mimeType:
              (isTargetLesson && metadata.mimeType) || lesson?.mimeType || "",
            description: lesson?.description || "",
            isPreview: Boolean(lesson?.isPreview),
            order: Number(lesson?.order || currentLessonIndex + 1),
            resources: normalizeArray(lesson?.resources),
          };
        },
      );

      return {
        ...section,
        title: safeSectionTitle,
        order: Number(section?.order || currentSectionIndex + 1),
        lessons,
      };
    },
  );

  return {
    ...formData,
    title: safeCourseTitle,
    category: safeCategory,
    instructorName: safeInstructor,
    instructor: safeInstructor,
    price: Number(formData.price || 0),
    level: formData.level || "Beginner",
    thumbnail: safeThumbnail,
    trailerVideoUrl: safeTrailer,
    trailer: safeTrailer,
    shortDescription: safeShortDescription,
    description: safeDescription,
    isFeatured: Boolean(formData.isFeatured),
    isPublished: Boolean(formData.isPublished),
    sections,
  };
};

const findSavedLesson = ({
  savedCourse,
  sectionIndex,
  lessonIndex,
  metadata,
}) => {
  const directLesson =
    savedCourse?.sections?.[sectionIndex]?.lessons?.[lessonIndex];

  if (directLesson?._id) {
    return directLesson;
  }

  const expectedTitle = cleanTitleFromVideo(metadata, "").toLowerCase();

  const allLessons = normalizeArray(savedCourse?.sections).flatMap((section) =>
    normalizeArray(section?.lessons),
  );

  return (
    allLessons.find((lesson) => {
      return (
        lesson?._id &&
        expectedTitle &&
        String(lesson?.title || "")
          .trim()
          .toLowerCase() === expectedTitle
      );
    }) || null
  );
};

const tryUpdateCreatedCourse = async ({ courseId, payload }) => {
  try {
    return await api.put(`/courses/admin/${courseId}`, payload);
  } catch (error) {
    const status = Number(error?.response?.status || 0);

    if (status === 404 || status === 405) {
      return await api.patch(`/courses/admin/${courseId}`, payload);
    }

    throw error;
  }
};

const formatSizeMB = (sizeBytes) => {
  const size = Number(sizeBytes || 0);

  if (size <= 0) return "";

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const AdminCourseCreatePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    _id: "",
    title: "",
    shortDescription: "",
    description: "",
    thumbnail: "",
    instructorName: "VeoLMS Instructor",
    price: 499,
    category: "",
    level: "Beginner",
    trailerVideoUrl: "",
    isFeatured: false,
    isPublished: true,
    sections: [createEmptySection(1)],
  });

  const [createdCourseId, setCreatedCourseId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const handleCourseChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]:
        type === "checkbox"
          ? checked
          : name === "price"
            ? Number(value)
            : value,
    }));

    setError("");
    setMessage("");
  };

  const handleSectionChange = (sectionIndex, field, value) => {
    setFormData((previousData) => {
      const sections = [...previousData.sections];

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        [field]: field === "order" ? Number(value) : value,
      };

      return {
        ...previousData,
        sections,
      };
    });

    setError("");
    setMessage("");
  };

  const handleLessonChange = (sectionIndex, lessonIndex, field, value) => {
    setFormData((previousData) => {
      const sections = [...previousData.sections];
      const lessons = [...sections[sectionIndex].lessons];

      lessons[lessonIndex] = {
        ...lessons[lessonIndex],
        [field]:
          field === "order"
            ? Number(value)
            : field === "isPreview"
              ? Boolean(value)
              : value,
      };

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons,
      };

      return {
        ...previousData,
        sections,
      };
    });

    setError("");
    setMessage("");
  };

  const updateLesson = (sectionIndex, lessonIndex, field, value) => {
    setFormData((previousData) => {
      const sections = [...previousData.sections];
      const lessons = [...sections[sectionIndex].lessons];

      lessons[lessonIndex] = {
        ...lessons[lessonIndex],
        [field]: value,
      };

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons,
      };

      return {
        ...previousData,
        sections,
      };
    });
  };

  const handleLessonVideoMeta = (sectionIndex, lessonIndex, metadata) => {
    setFormData((previousData) => {
      const sections = [...previousData.sections];
      const lessons = [...sections[sectionIndex].lessons];
      const currentLesson = lessons[lessonIndex];

      lessons[lessonIndex] = {
        ...currentLesson,
        title: currentLesson.title?.trim()
          ? currentLesson.title
          : metadata.title || currentLesson.title,
        duration: metadata.duration || currentLesson.duration,
        durationSeconds:
          metadata.durationSeconds || currentLesson.durationSeconds || 0,
        originalVideoName:
          metadata.originalVideoName || currentLesson.originalVideoName || "",
        sizeBytes: metadata.sizeBytes || currentLesson.sizeBytes || 0,
        mimeType: metadata.mimeType || currentLesson.mimeType || "",
        videoKey: metadata.videoKey || currentLesson.videoKey || "",
        videoUrl: metadata.videoUrl || currentLesson.videoUrl || "",
        videoAssetId:
          metadata.videoAssetId || currentLesson.videoAssetId || null,
        hlsManifestKey:
          metadata.hlsManifestKey || currentLesson.hlsManifestKey || "",
        hlsOutputPrefix:
          metadata.hlsOutputPrefix || currentLesson.hlsOutputPrefix || "",
      };

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons,
      };

      return {
        ...previousData,
        sections,
      };
    });
  };

  const resolveUploadContextForNewCourse = async ({
    sectionIndex,
    lessonIndex,
    metadata,
  }) => {
    try {
      setAutoSaving(true);
      setError("");
      setMessage("Creating course and lesson, then video upload will start...");

      const payload = buildSavableCoursePayload({
        formData,
        sectionIndexForVideo: sectionIndex,
        lessonIndexForVideo: lessonIndex,
        metadata,
      });

      const response = createdCourseId
        ? await tryUpdateCreatedCourse({
            courseId: createdCourseId,
            payload,
          })
        : await api.post("/courses/admin", payload);

      const savedCourse = getCourseFromResponse(response);

      if (!savedCourse?._id) {
        throw new Error("Course was not created correctly.");
      }

      const savedLesson = findSavedLesson({
        savedCourse,
        sectionIndex,
        lessonIndex,
        metadata,
      });

      if (!savedLesson?._id) {
        throw new Error(
          "Lesson id was not created. Please check required course and lesson fields, then try again.",
        );
      }

      setCreatedCourseId(savedCourse._id);
      setFormData((previousData) =>
        preserveClientIdsAfterSave({
          previousCourse: previousData,
          savedCourse: {
            ...savedCourse,
            _id: savedCourse._id,
          },
        }),
      );

      setMessage("Course and lesson created. Video upload started.");

      return {
        courseId: savedCourse._id,
        lessonId: savedLesson._id,
        courseSlug:
          savedCourse.slug || savedCourse.title || payload.title || "course",
      };
    } catch (error) {
      console.error("CREATE_COURSE_BEFORE_VIDEO_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to create course and lesson automatically.",
      );

      throw error;
    } finally {
      setAutoSaving(false);
    }
  };

  const addSection = () => {
    setFormData((previousData) => ({
      ...previousData,
      sections: [
        ...previousData.sections,
        createEmptySection(previousData.sections.length + 1),
      ],
    }));
  };

  const removeSection = (sectionIndex) => {
    if (formData.sections.length === 1) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this section?",
    );

    if (!confirmed) return;

    setFormData((previousData) => ({
      ...previousData,
      sections: previousData.sections
        .filter((_, index) => index !== sectionIndex)
        .map((section, index) => ({
          ...section,
          order: index + 1,
        })),
    }));
  };

  const addLesson = (sectionIndex) => {
    setFormData((previousData) => {
      const sections = [...previousData.sections];
      const lessons = sections[sectionIndex].lessons;

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons: [...lessons, createEmptyLesson(lessons.length + 1)],
      };

      return {
        ...previousData,
        sections,
      };
    });
  };

  const removeLesson = (sectionIndex, lessonIndex) => {
    const currentLessons = formData.sections[sectionIndex]?.lessons || [];

    if (currentLessons.length === 1) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this lesson?",
    );

    if (!confirmed) return;

    setFormData((previousData) => {
      const sections = [...previousData.sections];

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons: sections[sectionIndex].lessons
          .filter((_, index) => index !== lessonIndex)
          .map((lesson, index) => ({
            ...lesson,
            order: index + 1,
          })),
      };

      return {
        ...previousData,
        sections,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      setLoading(true);

      const payload = buildSavableCoursePayload({
        formData,
      });

      const response = createdCourseId
        ? await tryUpdateCreatedCourse({
            courseId: createdCourseId,
            payload,
          })
        : await api.post("/courses/admin", payload);

      const savedCourse = getCourseFromResponse(response);

      navigate("/admin/courses", {
        state: {
          message: createdCourseId
            ? "Course updated successfully."
            : "Course created successfully.",
          courseId: savedCourse?._id || createdCourseId,
        },
      });
    } catch (error) {
      console.error("CREATE_COURSE_ERROR:", error);

      const validationErrors = error.response?.data?.errors;

      if (Array.isArray(validationErrors)) {
        setError(validationErrors.map((err) => err.message).join(", "));
      } else {
        setError(error.response?.data?.message || "Failed to save course");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-300 md:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-10">
          <p className="mb-3 font-bold text-blue-700 dark:text-blue-400">
            Create Course
          </p>

          <h1 className="text-4xl font-black text-slate-950 md:text-5xl dark:text-white">
            New Course
          </h1>

          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">
            Choose a lesson video once. The app shows progress immediately,
            reads video details locally, creates the course and lesson id
            automatically, then uploads the same video file.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
            {message}
          </div>
        )}

        {createdCourseId && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            Draft course created. You can continue adding lessons here or click
            Create Course to finish.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className={panelClass}>
            <h2 className="mb-6 text-2xl font-black text-slate-950 dark:text-white">
              Course Information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Course Title</label>

                <input
                  name="title"
                  value={formData.title}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="React.js Complete Course"
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>

                <input
                  name="category"
                  value={formData.category}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="Frontend"
                />
              </div>

              <div>
                <label className={labelClass}>Instructor Name</label>

                <input
                  name="instructorName"
                  value={formData.instructorName}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="VeoLMS Instructor"
                />
              </div>

              <div>
                <label className={labelClass}>Price</label>

                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="499"
                />
              </div>

              <div>
                <label className={labelClass}>Level</label>

                <select
                  name="level"
                  value={formData.level}
                  onChange={handleCourseChange}
                  className={inputClass}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Thumbnail URL</label>

                <input
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Trailer Video URL</label>

                <input
                  name="trailerVideoUrl"
                  value={formData.trailerVideoUrl}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Short Description</label>

                <input
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleCourseChange}
                  required
                  className={inputClass}
                  placeholder="Build modern backend applications using Node.js."
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Full Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleCourseChange}
                  required
                  rows="5"
                  className={`${inputClass} resize-none`}
                  placeholder="Explain what students will learn..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-5">
              <label className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={Boolean(formData.isFeatured)}
                  onChange={handleCourseChange}
                  className="h-5 w-5 accent-blue-600"
                />
                Featured Course
              </label>

              <label className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={Boolean(formData.isPublished)}
                  onChange={handleCourseChange}
                  className="h-5 w-5 accent-blue-600"
                />
                Published
              </label>
            </div>
          </section>

          <section className={panelClass}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  Sections & Lessons
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Choose Video once. Video metadata and upload happen in one
                  flow.
                </p>
              </div>

              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>

            <div className="space-y-6">
              {formData.sections.map((section, sectionIndex) => (
                <article
                  key={
                    section.clientId || section._id || `section-${sectionIndex}`
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      Section {sectionIndex + 1}
                    </h3>

                    {formData.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(sectionIndex)}
                        className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        title="Remove section"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mb-5 grid gap-4 md:grid-cols-[1fr_160px]">
                    <input
                      value={section.title}
                      onChange={(event) =>
                        handleSectionChange(
                          sectionIndex,
                          "title",
                          event.target.value,
                        )
                      }
                      required
                      className={inputClass}
                      placeholder={`Section ${sectionIndex + 1} title`}
                    />

                    <input
                      type="number"
                      value={section.order}
                      onChange={(event) =>
                        handleSectionChange(
                          sectionIndex,
                          "order",
                          event.target.value,
                        )
                      }
                      required
                      className={inputClass}
                      placeholder="Order"
                    />
                  </div>

                  <div className="space-y-4">
                    {section.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={
                          lesson.clientId ||
                          lesson._id ||
                          `lesson-${sectionIndex}-${lessonIndex}`
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-950 dark:text-white">
                              Lesson {lessonIndex + 1}
                            </h4>

                            {lesson.originalVideoName && (
                              <p className="mt-1 text-xs text-slate-500">
                                Source: {lesson.originalVideoName}
                              </p>
                            )}
                          </div>

                          {section.lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeLesson(sectionIndex, lessonIndex)
                              }
                              className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                              title="Remove lesson"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-4">
                            <div>
                              <label className={labelClass}>Lesson Title</label>

                              <input
                                value={lesson.title}
                                onChange={(event) =>
                                  handleLessonChange(
                                    sectionIndex,
                                    lessonIndex,
                                    "title",
                                    event.target.value,
                                  )
                                }
                                required
                                className={inputClass}
                                placeholder="Auto-filled from video name"
                              />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Duration</label>

                                <input
                                  value={lesson.duration}
                                  onChange={(event) =>
                                    handleLessonChange(
                                      sectionIndex,
                                      lessonIndex,
                                      "duration",
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="Auto-filled"
                                />
                              </div>

                              <div>
                                <label className={labelClass}>
                                  Lesson Order
                                </label>

                                <input
                                  type="number"
                                  value={lesson.order}
                                  onChange={(event) =>
                                    handleLessonChange(
                                      sectionIndex,
                                      lessonIndex,
                                      "order",
                                      event.target.value,
                                    )
                                  }
                                  required
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={Boolean(lesson.isPreview)}
                                onChange={(event) =>
                                  handleLessonChange(
                                    sectionIndex,
                                    lessonIndex,
                                    "isPreview",
                                    event.target.checked,
                                  )
                                }
                                className="h-5 w-5 accent-blue-600"
                              />
                              Preview lesson
                            </label>

                            {(lesson.duration ||
                              lesson.originalVideoName ||
                              lesson.sizeBytes > 0 ||
                              lesson.mimeType ||
                              lesson.videoKey) && (
                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                                <p className="mb-2 flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-200">
                                  <FileVideo size={16} />
                                  Video Details
                                </p>

                                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                                  {lesson.duration && (
                                    <p className="flex items-center gap-2">
                                      <Clock size={14} />
                                      Duration: {lesson.duration}
                                    </p>
                                  )}

                                  {lesson.originalVideoName && (
                                    <p className="break-all">
                                      File: {lesson.originalVideoName}
                                    </p>
                                  )}

                                  {lesson.sizeBytes > 0 && (
                                    <p>
                                      Size: {formatSizeMB(lesson.sizeBytes)}
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
                            <label className={labelClass}>Lesson Video</label>

                            <VideoUploadField
                              value={lesson.videoUrl}
                              courseSlug={
                                formData.slug || formData.title || "course"
                              }
                              courseId={createdCourseId || formData._id || ""}
                              lessonId={
                                lesson._id &&
                                !String(lesson._id).startsWith("temp_")
                                  ? lesson._id
                                  : ""
                              }
                              disabled={loading || autoSaving}
                              resolveUploadContext={({ metadata }) =>
                                resolveUploadContextForNewCourse({
                                  sectionIndex,
                                  lessonIndex,
                                  metadata,
                                })
                              }
                              onMetaChange={(metadata) => {
                                handleLessonVideoMeta(
                                  sectionIndex,
                                  lessonIndex,
                                  metadata,
                                );
                              }}
                              onChange={(uploadedVideoSource) => {
                                updateLesson(
                                  sectionIndex,
                                  lessonIndex,
                                  "videoUrl",
                                  uploadedVideoSource,
                                );
                              }}
                              onUploadSuccess={(video, metadata) => {
                                handleLessonVideoMeta(
                                  sectionIndex,
                                  lessonIndex,
                                  {
                                    ...metadata,
                                    videoAssetId:
                                      video?._id || metadata?.videoAssetId,
                                  },
                                );
                              }}
                            />

                            {autoSaving && (
                              <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm font-bold text-blue-200">
                                <Loader2 size={16} className="animate-spin" />
                                Creating lesson id...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addLesson(sectionIndex)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <Plus size={18} />
                    Add Lesson
                  </button>
                </article>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/courses")}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || autoSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : createdCourseId ? (
                <CheckCircle size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading
                ? "Saving..."
                : createdCourseId
                  ? "Finish Course"
                  : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default AdminCourseCreatePage;
