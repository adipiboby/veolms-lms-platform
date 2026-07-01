import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, FileVideo, Plus, Trash2 } from "lucide-react";

import { api } from "../services/api";
import VideoUploadField from "../components/admin/VideoUploadField";

const createEmptyLesson = (order = 1) => ({
  title: "",
  videoUrl: "",
  videoKey: "",
  videoAssetId: null,
  duration: "",
  durationSeconds: 0,
  originalVideoName: "",
  sizeBytes: 0,
  mimeType: "",
  isPreview: false,
  order,
});

const createEmptySection = (order = 1) => ({
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

const AdminCourseCreatePage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLoading(true);

      await api.post("/courses/admin", formData);

      navigate("/admin/courses");
    } catch (error) {
      console.error("CREATE_COURSE_ERROR:", error);

      const validationErrors = error.response?.data?.errors;

      if (Array.isArray(validationErrors)) {
        setError(validationErrors.map((err) => err.message).join(", "));
      } else {
        setError(error.response?.data?.message || "Failed to create course");
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
            Add course details, sections, lessons, preview videos, and
            publishing settings. When you upload a lesson video, the title and
            duration will auto-fill from the selected video.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
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
                  placeholder="Build modern frontend applications using React."
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
                  checked={formData.isFeatured}
                  onChange={handleCourseChange}
                  className="h-5 w-5 accent-blue-600"
                />
                Featured Course
              </label>

              <label className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
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
                  Upload video first. Lesson title and duration will fill
                  automatically.
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
                  key={sectionIndex}
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
                      placeholder="Section title"
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
                        key={lessonIndex}
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
                                  placeholder="Lesson order"
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={lesson.isPreview}
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
                              lesson.sizeBytes > 0 ||
                              lesson.mimeType) && (
                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-200">
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

                                  {lesson.sizeBytes > 0 && (
                                    <p>
                                      Size:{" "}
                                      {(
                                        Number(lesson.sizeBytes) /
                                        1024 /
                                        1024
                                      ).toFixed(2)}{" "}
                                      MB
                                    </p>
                                  )}

                                  {lesson.mimeType && (
                                    <p>Type: {lesson.mimeType}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className={labelClass}>Lesson Video</label>

                            <VideoUploadField
                              value={lesson.videoUrl}
                              courseSlug={formData.title || "course"}
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
                            />

                            {lesson.videoKey && (
                              <p className="mt-2 break-all rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-900">
                                Video Key: {lesson.videoKey}
                              </p>
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

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/courses")}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default AdminCourseCreatePage;
