import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CheckCircle,
  Download,
  Edit3,
  FileText,
  Loader2,
  PlayCircle,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../services/api";
import VideoPlayer from "../components/video/VideoPlayer";

const LEARNING_COURSE_TITLE_KEY = "veolms_current_learning_course_title";

const getSafeCompletedLessonIds = (lessonProgress = []) => {
  if (!Array.isArray(lessonProgress)) return new Set();

  return new Set(
    lessonProgress
      .filter((item) => item?.isCompleted)
      .map((item) => String(item.lessonId || item.lesson || ""))
      .filter(Boolean),
  );
};

const getSafeProgressValues = ({ progress, completedLessonIds, lessons }) => {
  const totalLessonsFromApi = Number(progress?.totalLessons || 0);
  const totalLessonsFromCourse = Array.isArray(lessons) ? lessons.length : 0;

  const totalLessons = totalLessonsFromApi || totalLessonsFromCourse;

  const completedFromUniqueIds = completedLessonIds?.size || 0;
  const completedFromApi = Number(progress?.completedLessons || 0);

  const rawCompletedLessons = completedFromUniqueIds || completedFromApi;

  const completedLessons = totalLessons
    ? Math.min(rawCompletedLessons, totalLessons)
    : rawCompletedLessons;

  const progressPercentage = totalLessons
    ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
    : Math.min(100, Math.max(0, Number(progress?.progressPercentage || 0)));

  return {
    totalLessons,
    completedLessons,
    progressPercentage,
  };
};

const sanitizeFileName = (value) => {
  return String(value || "lesson-note")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
};

const renderInlineMarkdown = (text) => {
  const parts = String(text).split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
};

const NotePreview = ({ content }) => {
  const lines = String(content || "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());

  if (!lines.length) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        No note written for this lesson yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const key = `${line}-${index}`;

        if (line.startsWith("# ")) {
          return (
            <h3
              key={key}
              className="border-b border-white/10 pb-2 text-xl font-black leading-snug text-white"
            >
              {line.replace("# ", "")}
            </h3>
          );
        }

        if (line.startsWith("## ")) {
          return (
            <h4
              key={key}
              className="pt-1 text-base font-black leading-snug text-slate-100"
            >
              {line.replace("## ", "")}
            </h4>
          );
        }

        if (line.startsWith("•")) {
          return (
            <p
              key={key}
              className="pl-3 text-[15px] font-semibold leading-7 text-slate-200"
            >
              {renderInlineMarkdown(line)}
            </p>
          );
        }

        return (
          <p key={key} className="text-sm leading-7 text-slate-300">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

const LearningPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const noteTextareaRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [progress, setProgress] = useState({
    totalLessons: 0,
    completedLessons: 0,
    progressPercentage: 0,
    lessonProgress: [],
    currentLessonId: null,
  });

  const [markingComplete, setMarkingComplete] = useState(false);

  const [videoSource, setVideoSource] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");

  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [notesByLessonId, setNotesByLessonId] = useState({});
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteDeleting, setNoteDeleting] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteError, setNoteError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteEditMode, setNoteEditMode] = useState(false);

  const lessons = useMemo(() => {
    if (!course?.sections) return [];

    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        ...lesson,
        sectionTitle: section.title,
      })),
    );
  }, [course]);

  const completedLessonIds = useMemo(() => {
    return getSafeCompletedLessonIds(progress.lessonProgress);
  }, [progress.lessonProgress]);

  const safeProgress = useMemo(() => {
    return getSafeProgressValues({
      progress,
      completedLessonIds,
      lessons,
    });
  }, [progress, completedLessonIds, lessons]);

  const hasCurrentLessonNote = noteContent.trim().length > 0;

  const updateNavbarCourseTitle = (title) => {
    if (!title) return;

    localStorage.setItem(LEARNING_COURSE_TITLE_KEY, title);

    window.dispatchEvent(
      new CustomEvent("veolms-learning-course-change", {
        detail: {
          title,
        },
      }),
    );
  };

  const focusNoteTypingArea = () => {
    setNoteEditMode(true);

    setTimeout(() => {
      const textarea = noteTextareaRef.current;

      if (!textarea) return;

      textarea.focus();

      const textLength = textarea.value.length;
      textarea.setSelectionRange(textLength, textLength);

      textarea.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  };

  const toggleNotesPanel = () => {
    const nextOpenState = !notesOpen;

    setNotesOpen(nextOpenState);

    if (nextOpenState) {
      setNoteEditMode(!hasCurrentLessonNote);
    }
  };

  const addTextToNote = (text, block = false) => {
    setNoteContent((previousNote) => {
      const prefix = previousNote.trim() ? (block ? "\n\n" : " ") : "";
      return `${previousNote}${prefix}${text}`;
    });

    setNoteMessage("");
    setNoteError("");
    focusNoteTypingArea();
  };

  const addEmojiToNote = (emoji) => {
    addTextToNote(`${emoji} `, false);
  };

  const addFormatToNote = (type) => {
    const templates = {
      h1: "# Main Heading\n",
      h2: "## Sub Heading\n",
      point: "• **Write your point here**",
      doubt: "❓ Doubt: ",
      summary: "📝 Summary: ",
    };

    addTextToNote(templates[type] || "", true);
  };

  const handleDownloadNote = () => {
    if (!hasCurrentLessonNote) return;

    const lessonTitle = currentLesson?.title || "Lesson Note";
    const courseTitle = course?.title || "Course";

    const markdown = `# ${lessonTitle}

Course: ${courseTitle}

---

${noteContent.trim()}
`;

    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${sanitizeFileName(lessonTitle)}-note.md`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const fetchCertificateForCourse = async (courseId) => {
    try {
      const res = await api.get(`/certificates/course/${courseId}`);
      setCertificate(res.data.certificate);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Certificate fetch failed:", error);
      }
    }
  };

  const fetchCourseNotes = async (courseId) => {
    if (!courseId) return;

    try {
      const res = await api.get(`/notes/course/${courseId}`);

      const notes = Array.isArray(res.data.notes) ? res.data.notes : [];
      const noteMap = {};

      notes.forEach((note) => {
        if (note.lessonId) {
          noteMap[String(note.lessonId)] = note.content || "";
        }
      });

      setNotesByLessonId(noteMap);
    } catch (error) {
      console.error("FETCH_COURSE_NOTES_ERROR:", error);
      setNotesByLessonId({});
    }
  };

  const loadSecureVideo = async (lesson) => {
    if (!course?._id || !lesson?._id) return;

    try {
      setVideoLoading(true);
      setVideoError("");
      setVideoSource("");

      const res = await api.post("/videos/signed-url", {
        courseId: course._id,
        lessonId: lesson._id,
      });

      setVideoSource(res.data.videoUrl);
    } catch (error) {
      console.error("Failed to load secure video:", error);

      setVideoError(
        error.response?.data?.message || "Failed to load secure video",
      );

      setVideoSource("");
    } finally {
      setVideoLoading(false);
    }
  };

  const loadLessonNote = async (lesson) => {
    if (!course?._id || !lesson?._id) return;

    try {
      setNoteLoading(true);
      setNoteError("");
      setNoteMessage("");

      const lessonId = String(lesson._id);

      if (notesByLessonId[lessonId]) {
        setNoteContent(notesByLessonId[lessonId]);
      } else {
        setNoteContent("");
      }

      const res = await api.get(
        `/notes/course/${course._id}/lesson/${lesson._id}`,
      );

      const content = res.data.note?.content || "";

      setNoteContent(content);

      setNotesByLessonId((previousNotes) => ({
        ...previousNotes,
        [lessonId]: content,
      }));

      if (notesOpen) {
        setNoteEditMode(!content.trim());
      }
    } catch (error) {
      console.error("LOAD_LESSON_NOTE_ERROR:", error);

      setNoteError(error.response?.data?.message || "Failed to load note");
    } finally {
      setNoteLoading(false);
    }
  };

  useEffect(() => {
    const fetchLearningCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/enrollments/learn/${slug}`);

        const loadedCourse = res.data.course;
        setCourse(loadedCourse);
        updateNavbarCourseTitle(loadedCourse.title);

        const progressRes = await api.get(
          `/progress/course/${loadedCourse._id}`,
        );

        setProgress(progressRes.data);

        await fetchCertificateForCourse(loadedCourse._id);
        await fetchCourseNotes(loadedCourse._id);

        const allLessons =
          loadedCourse.sections
            ?.flatMap((section) =>
              section.lessons.map((lesson) => ({
                ...lesson,
                sectionTitle: section.title,
              })),
            )
            ?.sort((a, b) => a.order - b.order) || [];

        const resumeLesson =
          allLessons.find(
            (lesson) =>
              String(lesson._id) === String(progressRes.data.currentLessonId),
          ) || allLessons[0];

        setCurrentLesson(resumeLesson || null);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message || "Failed to load course lessons",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearningCourse();
  }, [slug]);

  useEffect(() => {
    if (course && currentLesson) {
      loadSecureVideo(currentLesson);
      loadLessonNote(currentLesson);
    }
  }, [course?._id, currentLesson?._id]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("veolms-learning-course-change", {
          detail: {
            title: "",
          },
        }),
      );
    };
  }, []);

  const handleLessonClick = async (lesson, sectionTitle) => {
    try {
      setCurrentLesson({
        ...lesson,
        sectionTitle,
      });

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: lesson._id,
        isCompleted: completedLessonIds.has(String(lesson._id)),
      });

      const progressRes = await api.get(`/progress/course/${course._id}`);
      setProgress(progressRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkLessonComplete = async () => {
    if (!course?._id || !currentLesson?._id) return;

    try {
      setMarkingComplete(true);

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: currentLesson._id,
        isCompleted: true,
      });

      const progressRes = await api.get(`/progress/course/${course._id}`);
      setProgress(progressRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleSaveNote = async () => {
    if (!course?._id || !currentLesson?._id) return;

    try {
      setNoteSaving(true);
      setNoteError("");
      setNoteMessage("");

      const res = await api.post(
        `/notes/course/${course._id}/lesson/${currentLesson._id}`,
        {
          content: noteContent,
        },
      );

      const savedContent = res.data.note?.content || "";

      setNoteContent(savedContent);

      setNotesByLessonId((previousNotes) => {
        const lessonId = String(currentLesson._id);

        if (!savedContent.trim()) {
          const updatedNotes = { ...previousNotes };
          delete updatedNotes[lessonId];
          return updatedNotes;
        }

        return {
          ...previousNotes,
          [lessonId]: savedContent,
        };
      });

      setNoteMessage("Note saved");
      setNoteEditMode(!savedContent.trim());
    } catch (error) {
      console.error("SAVE_NOTE_ERROR:", error);

      setNoteError(error.response?.data?.message || "Failed to save note");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!course?._id || !currentLesson?._id) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this note?",
    );

    if (!confirmDelete) return;

    try {
      setNoteDeleting(true);
      setNoteError("");
      setNoteMessage("");

      await api.delete(
        `/notes/course/${course._id}/lesson/${currentLesson._id}`,
      );

      setNoteContent("");

      setNotesByLessonId((previousNotes) => {
        const updatedNotes = { ...previousNotes };
        delete updatedNotes[String(currentLesson._id)];
        return updatedNotes;
      });

      setNoteMessage("Note deleted");
      setNoteEditMode(true);
    } catch (error) {
      console.error("DELETE_NOTE_ERROR:", error);

      setNoteError(error.response?.data?.message || "Failed to delete note");
    } finally {
      setNoteDeleting(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!course?._id) return;

    try {
      setCertificateLoading(true);
      setCertificateError("");

      const res = await api.post("/certificates/generate", {
        courseId: course._id,
      });

      setCertificate(res.data.certificate);

      navigate(`/certificates/${res.data.certificate.certificateId}`);
    } catch (error) {
      console.error("Certificate generation failed:", error);

      setCertificateError(
        error.response?.data?.message || "Failed to generate certificate",
      );
    } finally {
      setCertificateLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-4 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          Loading learning page...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-4 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="mb-3 text-3xl font-black text-red-300">
            Access Denied
          </h1>

          <p className="mb-6 text-slate-300">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            {videoLoading ? (
              <div className="flex aspect-video flex-col items-center justify-center bg-black text-slate-400">
                <Loader2 className="animate-spin text-blue-400" size={36} />
                <p className="mt-3 font-semibold">Preparing secure video...</p>
              </div>
            ) : videoError ? (
              <div className="flex aspect-video items-center justify-center bg-black text-red-300">
                {videoError}
              </div>
            ) : videoSource ? (
              <VideoPlayer
                key={currentLesson?._id}
                src={videoSource}
                title={currentLesson?.title}
                onEnded={handleMarkLessonComplete}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black text-slate-400">
                No video selected
              </div>
            )}

            <div className="p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-blue-300">
                {currentLesson?.sectionTitle}
              </p>

              <h2 className="mb-3 text-2xl font-black leading-tight md:text-3xl">
                {currentLesson?.title}
              </h2>

              <p className="text-slate-400">
                Watch this lesson and continue through the course curriculum.
              </p>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Course Progress</p>

                  <p className="text-sm font-bold text-blue-300">
                    {safeProgress.progressPercentage}%
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                    style={{ width: `${safeProgress.progressPercentage}%` }}
                  />
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {safeProgress.completedLessons} of {safeProgress.totalLessons}{" "}
                  lessons completed
                </p>
              </div>

              <button
                onClick={handleMarkLessonComplete}
                disabled={
                  markingComplete ||
                  completedLessonIds.has(String(currentLesson?._id))
                }
                className="mt-6 rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {completedLessonIds.has(String(currentLesson?._id))
                  ? "Completed"
                  : markingComplete
                    ? "Saving..."
                    : "Mark as Complete"}
              </button>

              {safeProgress.progressPercentage === 100 && (
                <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-300">
                      <Award size={24} />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-yellow-300">
                        Course Completed 🎉
                      </h3>

                      <p className="mt-2 text-slate-300">
                        You completed all lessons. You can now generate your
                        certificate.
                      </p>

                      {certificateError && (
                        <p className="mt-3 text-sm text-red-300">
                          {certificateError}
                        </p>
                      )}

                      {certificate ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/certificates/${certificate.certificateId}`,
                            )
                          }
                          className="mt-4 inline-flex rounded-2xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700"
                        >
                          View Certificate
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerateCertificate}
                          disabled={certificateLoading}
                          className="mt-4 rounded-2xl bg-yellow-500 px-6 py-3 font-black text-slate-950 hover:bg-yellow-600 disabled:opacity-60"
                        >
                          {certificateLoading
                            ? "Generating..."
                            : "Generate Certificate"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black leading-tight">
                      Course Lessons
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {lessons.length} lessons
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleNotesPanel}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                    notesOpen
                      ? "border-blue-400/50 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                  title="Lesson notes"
                >
                  {notesOpen ? <X size={21} /> : <FileText size={21} />}

                  {hasCurrentLessonNote && !notesOpen && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-400" />
                  )}
                </button>
              </div>
            </div>

            {notesOpen && (
              <div className="border-b border-white/10 bg-slate-950/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                    Lesson Notes
                  </p>

                  {noteLoading && (
                    <Loader2 className="animate-spin text-blue-400" size={18} />
                  )}
                </div>

                {noteError && (
                  <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {noteError}
                  </div>
                )}

                {noteMessage && (
                  <div className="mb-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                    {noteMessage}
                  </div>
                )}

                {hasCurrentLessonNote && !noteEditMode ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-blue-300">
                          <FileText size={22} />
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                            Saved Note
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            Click note text or Edit to continue writing
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadNote}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          <Download size={16} />
                          Download
                        </button>

                        <button
                          type="button"
                          onClick={focusNoteTypingArea}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={focusNoteTypingArea}
                      className="w-full cursor-text rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
                      title="Click to edit note"
                    >
                      <NotePreview content={noteContent} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      disabled={noteDeleting || noteLoading}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      {noteDeleting ? "Deleting..." : "Delete Note"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addFormatToNote("h1")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-slate-100 hover:bg-white/10"
                        >
                          H1 Heading
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("h2")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-slate-100 hover:bg-white/10"
                        >
                          H2 Sub
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("point")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          • Point
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("doubt")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          Doubt
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("summary")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          Summary
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {["📌", "💡", "✅", "❓", "⭐", "🔥", "📝"].map(
                          (emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => addEmojiToNote(emoji)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
                              title={`Add ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    <textarea
                      ref={noteTextareaRef}
                      value={noteContent}
                      onChange={(event) => {
                        setNoteContent(event.target.value);
                        setNoteMessage("");
                        setNoteError("");
                      }}
                      rows={12}
                      maxLength={5000}
                      placeholder={`Example:
# Main Heading

💡 Important:
React components help split UI into reusable parts.

• **Props pass data from parent to child**
❓ Doubt: Revise useEffect again.`}
                      className="w-full resize-none rounded-3xl border border-white/10 bg-slate-900 px-5 py-4 text-[15px] leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400/50"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={noteSaving || noteLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Save size={16} />
                        {noteSaving ? "Saving..." : "Save"}
                      </button>

                      {noteContent.trim() && (
                        <button
                          type="button"
                          onClick={handleDownloadNote}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          <Download size={16} />
                          Download
                        </button>
                      )}

                      {hasCurrentLessonNote && (
                        <button
                          type="button"
                          onClick={() => setNoteEditMode(false)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleDeleteNote}
                        disabled={
                          noteDeleting || noteLoading || !noteContent.trim()
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {noteDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {noteContent.length}/5000 characters
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="max-h-[720px] overflow-y-auto">
              {course?.sections?.map((section) => (
                <div key={section._id} className="border-b border-white/10">
                  <div className="bg-slate-950/60 px-5 py-4">
                    <h4 className="text-lg font-black text-white">
                      {section.title}
                    </h4>
                  </div>

                  <div className="space-y-3 p-4">
                    {section.lessons.map((lesson) => {
                      const lessonId = String(lesson._id);
                      const isActive = String(currentLesson?._id) === lessonId;
                      const isCompleted = completedLessonIds.has(lessonId);
                      const lessonHasNote =
                        Boolean(notesByLessonId[lessonId]?.trim()) ||
                        (isActive && hasCurrentLessonNote);

                      return (
                        <button
                          key={lesson._id}
                          onClick={() =>
                            handleLessonClick(lesson, section.title)
                          }
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isActive
                              ? "border-blue-500/70 bg-blue-600/20"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 shrink-0 ${
                                isCompleted
                                  ? "text-green-300"
                                  : isActive
                                    ? "text-blue-300"
                                    : "text-slate-400"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle size={18} />
                              ) : (
                                <PlayCircle size={18} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-base font-black leading-6 text-white">
                                {lesson.title}
                              </p>

                              <p className="mt-2 text-sm text-slate-400">
                                {lesson.duration}
                              </p>
                            </div>

                            {lessonHasNote && (
                              <FileText
                                size={18}
                                className="mt-1 shrink-0 text-blue-300"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default LearningPage;
