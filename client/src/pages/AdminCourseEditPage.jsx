import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../services/api";
import AdminLayout from "../components/admin/AdminLayout";
import VideoUploadField from "../components/admin/VideoUploadField";
const emptyLesson = {
  title: "",
  videoUrl: "",
  duration: "10:00",
  isPreview: false,
  order: 1,
};

const emptySection = {
  title: "",
  order: 1,
  lessons: [{ ...emptyLesson }],
};

const AdminCourseEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState(null);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setPageLoading(true);
        const res = await api.get(`/courses/admin/${id}`);

        const course = res.data.course;

        setFormData({
          title: course.title || "",
          shortDescription: course.shortDescription || "",
          description: course.description || "",
          thumbnail: course.thumbnail || "",
          instructorName: course.instructorName || "VeoLMS Instructor",
          price: course.price || 0,
          category: course.category || "",
          level: course.level || "Beginner",
          trailerVideoUrl: course.trailerVideoUrl || "",
          isFeatured: Boolean(course.isFeatured),
          isPublished: Boolean(course.isPublished),
          sections:
            course.sections?.length > 0
              ? course.sections.map((section, sectionIndex) => ({
                  title: section.title || "",
                  order: section.order || sectionIndex + 1,
                  lessons:
                    section.lessons?.length > 0
                      ? section.lessons.map((lesson, lessonIndex) => ({
                          title: lesson.title || "",
                          videoUrl: lesson.videoUrl || "",
                          duration: lesson.duration || "10:00",
                          isPreview: Boolean(lesson.isPreview),
                          order: lesson.order || lessonIndex + 1,
                        }))
                      : [{ ...emptyLesson }],
                }))
              : [{ ...emptySection }],
        });
      } catch (error) {
        console.error(error);
        setError(error.response?.data?.message || "Failed to fetch course");
      } finally {
        setPageLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  const handleCourseChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "price"
            ? Number(value)
            : value,
    }));
  };

  const handleSectionChange = (sectionIndex, field, value) => {
    setFormData((prev) => {
      const sections = [...prev.sections];

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        [field]: field === "order" ? Number(value) : value,
      };

      return { ...prev, sections };
    });
  };

  const handleLessonChange = (sectionIndex, lessonIndex, field, value) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
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

      return { ...prev, sections };
    });
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          ...emptySection,
          order: prev.sections.length + 1,
          lessons: [{ ...emptyLesson }],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const addLesson = (sectionIndex) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      const lessons = sections[sectionIndex].lessons;

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons: [
          ...lessons,
          {
            ...emptyLesson,
            order: lessons.length + 1,
          },
        ],
      };

      return { ...prev, sections };
    });
  };

  const removeLesson = (sectionIndex, lessonIndex) => {
    setFormData((prev) => {
      const sections = [...prev.sections];

      sections[sectionIndex] = {
        ...sections[sectionIndex],
        lessons: sections[sectionIndex].lessons.filter(
          (_, index) => index !== lessonIndex,
        ),
      };

      return { ...prev, sections };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSaving(true);

      await api.put(`/courses/admin/${id}`, formData);

      navigate("/admin/courses");
    } catch (error) {
      console.error(error);

      const validationErrors = error.response?.data?.errors;

      if (Array.isArray(validationErrors)) {
        setError(validationErrors.map((err) => err.message).join(", "));
      } else {
        setError(error.response?.data?.message || "Failed to update course");
      }
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <AdminLayout>
        <div className="px-4 md:px-8 py-8 text-slate-400">
          Loading course...
        </div>
      </AdminLayout>
    );
  }

  if (!formData) {
    return (
      <AdminLayout>
        <div className="px-4 md:px-8 py-8 text-red-300">Course not found.</div>
      </AdminLayout>
    );
  }
  const updateLesson = (sectionIndex, lessonIndex, field, value) => {
    setFormData((prev) => {
      const updatedSections = [...prev.sections];
      const updatedLessons = [...updatedSections[sectionIndex].lessons];

      updatedLessons[lessonIndex] = {
        ...updatedLessons[lessonIndex],
        [field]: value,
      };

      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        lessons: updatedLessons,
      };

      return {
        ...prev,
        sections: updatedSections,
      };
    });
  };
  return (
   
      <div className="px-4 md:px-8 py-8">
        <div className="mb-10">
          <p className="text-blue-400 font-bold mb-3">Edit Course</p>

          <h1 className="text-4xl md:text-5xl font-black text-white">
            Update Course
          </h1>

          <p className="text-slate-400 mt-3">
            Edit course details, sections, lessons, preview status, and
            publishing settings.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-2xl font-black mb-6">Course Information</h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Course Title
                </label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Category
                </label>
                <input
                  name="category"
                  value={formData.category}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Instructor Name
                </label>
                <input
                  name="instructorName"
                  value={formData.instructorName}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleCourseChange}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Thumbnail URL
                </label>
                <input
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">
                  Trailer Video URL
                </label>
                <input
                  name="trailerVideoUrl"
                  value={formData.trailerVideoUrl}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">
                  Short Description
                </label>
                <input
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-2">
                  Full Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleCourseChange}
                  required
                  rows="5"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-5 mt-6">
              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleCourseChange}
                />
                Featured Course
              </label>

              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleCourseChange}
                />
                Published
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">Sections & Lessons</h2>

              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>

            <div className="space-y-6">
              {formData.sections.map((section, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className="rounded-2xl bg-slate-950 border border-white/10 p-5"
                >
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <h3 className="text-xl font-black">
                      Section {sectionIndex + 1}
                    </h3>

                    {formData.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(sectionIndex)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-5">
                    <input
                      value={section.title}
                      onChange={(e) =>
                        handleSectionChange(
                          sectionIndex,
                          "title",
                          e.target.value,
                        )
                      }
                      required
                      className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                      placeholder="Section title"
                    />

                    <input
                      type="number"
                      value={section.order}
                      onChange={(e) =>
                        handleSectionChange(
                          sectionIndex,
                          "order",
                          e.target.value,
                        )
                      }
                      required
                      className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                      placeholder="Order"
                    />
                  </div>

                  <div className="space-y-4">
                    {section.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lessonIndex}
                        className="rounded-2xl bg-white/5 border border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold">
                            Lesson {lessonIndex + 1}
                          </h4>

                          {section.lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeLesson(sectionIndex, lessonIndex)
                              }
                              className="p-2 rounded-xl bg-red-500/10 text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            value={lesson.title}
                            onChange={(e) =>
                              handleLessonChange(
                                sectionIndex,
                                lessonIndex,
                                "title",
                                e.target.value,
                              )
                            }
                            required
                            className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                            placeholder="Lesson title"
                          />

                          <VideoUploadField
                            value={lesson.videoUrl}
                            onChange={(uploadedVideoSource) => {
                              updateLesson(
                                sectionIndex,
                                lessonIndex,
                                "videoUrl",
                                uploadedVideoSource,
                              );
                            }}
                          />

                          <input
                            value={lesson.duration}
                            onChange={(e) =>
                              handleLessonChange(
                                sectionIndex,
                                lessonIndex,
                                "duration",
                                e.target.value,
                              )
                            }
                            className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                            placeholder="10:00"
                          />

                          <input
                            type="number"
                            value={lesson.order}
                            onChange={(e) =>
                              handleLessonChange(
                                sectionIndex,
                                lessonIndex,
                                "order",
                                e.target.value,
                              )
                            }
                            required
                            className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white outline-none focus:border-blue-500"
                            placeholder="Lesson order"
                          />
                        </div>

                        <label className="flex items-center gap-3 text-slate-300 mt-4">
                          <input
                            type="checkbox"
                            checked={lesson.isPreview}
                            onChange={(e) =>
                              handleLessonChange(
                                sectionIndex,
                                lessonIndex,
                                "isPreview",
                                e.target.checked,
                              )
                            }
                          />
                          Preview lesson
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addLesson(sectionIndex)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                  >
                    <Plus size={18} />
                    Add Lesson
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/courses")}
              className="px-6 py-3 rounded-2xl bg-white/10 text-white font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    
  );
};

export default AdminCourseEditPage;
