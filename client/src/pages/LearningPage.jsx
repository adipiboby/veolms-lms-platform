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
  MessageCircle,
  Paperclip,
  PlayCircle,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../services/api";
import VideoPlayer from "../components/video/VideoPlayer";
import LessonComments from "../components/comments/LessonComments";

const LEARNING_COURSE_TITLE_KEY = "veolms_current_learning_course_title";

const ENABLE_HLS_PLAYBACK = import.meta.env.VITE_ENABLE_HLS_PLAYBACK === "true";

const SIGNED_VIDEO_REFRESH_BUFFER_SECONDS = 120;
const MIN_SIGNED_VIDEO_REFRESH_SECONDS = 60;

const hasReadyHls = (lesson) => {
  return Boolean(
    lesson?.hlsManifestKey ||
    lesson?.videoHlsManifestKey ||
    lesson?.hlsOutputPrefix,
  );
};

const getSignedVideoRefreshDelayMs = (expiresInSeconds) => {
  const safeExpiresIn = Number(expiresInSeconds || 0);

  if (!safeExpiresIn) return 0;

  const refreshAfterSeconds = Math.max(
    MIN_SIGNED_VIDEO_REFRESH_SECONDS,
    safeExpiresIn - SIGNED_VIDEO_REFRESH_BUFFER_SECONDS,
  );

  return refreshAfterSeconds * 1000;
};

const getSafeCompletedLessonIds = (lessonProgress = []) => {
  if (!Array.isArray(lessonProgress)) return new Set();

  return new Set(
    lessonProgress
      .filter((item) => item?.isCompleted === true || item?.completed === true)
      .map((item) => {
        return (
          item?.lessonId?._id ||
          item?.lessonId ||
          item?.lesson?._id ||
          item?.lesson ||
          ""
        );
      })
      .map((id) => String(id))
      .filter(Boolean),
  );
};

const getSafeProgressValues = ({ progress, completedLessonIds, lessons }) => {
  const totalLessonsFromApi = Number(progress?.totalLessons || 0);
  const totalLessonsFromCourse = Array.isArray(lessons) ? lessons.length : 0;

  const totalLessons = totalLessonsFromApi || totalLessonsFromCourse;

  const completedFromUniqueIds = completedLessonIds?.size || 0;
  const completedFromApi = Number(progress?.completedLessons || 0);

  const completedLessons = totalLessons
    ? Math.min(completedFromUniqueIds || completedFromApi, totalLessons)
    : completedFromUniqueIds || completedFromApi;

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
        <strong
          key={index}
          className="font-black text-slate-950 dark:text-white"
        >
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
              className="border-b border-slate-200 pb-2 text-xl font-black leading-snug text-slate-950 dark:border-white/10 dark:text-white"
            >
              {line.replace("# ", "")}
            </h3>
          );
        }

        if (line.startsWith("## ")) {
          return (
            <h4
              key={key}
              className="pt-1 text-base font-black leading-snug text-slate-800 dark:text-slate-100"
            >
              {line.replace("## ", "")}
            </h4>
          );
        }

        if (line.startsWith("•")) {
          return (
            <p
              key={key}
              className="pl-3 text-[15px] font-semibold leading-7 text-slate-700 dark:text-slate-200"
            >
              {renderInlineMarkdown(line)}
            </p>
          );
        }

        return (
          <p
            key={key}
            className="text-sm leading-7 text-slate-700 dark:text-slate-300"
          >
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

const getLessonResources = (lesson) => {
  if (Array.isArray(lesson?.resources)) return lesson.resources;
  if (Array.isArray(lesson?.attachments)) return lesson.attachments;
  if (Array.isArray(lesson?.files)) return lesson.files;

  return [];
};

const getResourceTitle = (resource) => {
  return (
    resource?.title ||
    resource?.name ||
    resource?.fileName ||
    resource?.originalName ||
    "Lesson Resource"
  );
};

const getResourceType = (resource) => {
  return resource?.type || resource?.mimeType || resource?.fileType || "File";
};

const getResourceSize = (resource) => {
  const size = Number(resource?.size || resource?.sizeBytes || 0);

  if (!size) return "";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getProgressFromResponse = (response) => {
  return (
    response?.data?.progress || response?.data?.data || response?.data || {}
  );
};

const normalizeProgress = (loadedProgress = {}) => {
  return {
    totalLessons: Number(loadedProgress?.totalLessons || 0),
    completedLessons: Number(loadedProgress?.completedLessons || 0),
    progressPercentage: Number(loadedProgress?.progressPercentage || 0),
    lessonProgress: Array.isArray(loadedProgress?.lessonProgress)
      ? loadedProgress.lessonProgress
      : [],
    currentLessonId: loadedProgress?.currentLessonId || null,
  };
};

const TabButton = ({ active, icon: Icon, label, badge, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
        active
          ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      <Icon size={17} />
      {label}

      {badge !== undefined && badge !== null && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

const LessonResources = ({ courseId, lesson }) => {
  const resources = getLessonResources(lesson);

  const [openingResourceId, setOpeningResourceId] = useState("");
  const [resourceError, setResourceError] = useState("");

  const handleOpenResource = async (resource) => {
    if (!courseId || !lesson?._id || !resource?._id) {
      setResourceError("Resource details are missing.");
      return;
    }

    try {
      setOpeningResourceId(resource._id);
      setResourceError("");

      const response = await api.get(
        `/lesson-resources/download-url/${courseId}/${lesson._id}/${resource._id}`,
      );

      const downloadUrl = response.data.downloadUrl;

      if (!downloadUrl) {
        throw new Error("Download URL not received.");
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("STUDENT_RESOURCE_DOWNLOAD_ERROR:", error);

      setResourceError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to open resource.",
      );
    } finally {
      setOpeningResourceId("");
    }
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/70">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            <Paperclip size={24} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Lesson Resources
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Files and materials added by admin for this lesson.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
          {resources.length} files
        </span>
      </div>

      {resourceError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {resourceError}
        </div>
      )}

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <FileText size={27} />
          </div>

          <h3 className="mt-4 font-black text-slate-950 dark:text-white">
            No resources added yet
          </h3>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            When admin attaches PDF, ZIP, notes, or assignment files, they will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {resources.map((resource, index) => (
            <article
              key={resource?._id || resource?.fileKey || resource?.url || index}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <FileText size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black text-slate-950 dark:text-white">
                  {getResourceTitle(resource)}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {getResourceType(resource)}
                  {getResourceSize(resource)
                    ? ` • ${getResourceSize(resource)}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenResource(resource)}
                disabled={openingResourceId === resource._id}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {openingResourceId === resource._id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Open
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const LearningPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const noteTextareaRef = useRef(null);
  const videoRefreshTimerRef = useRef(null);
  const activeVideoRequestIdRef = useRef(0);
  const lastSavedWatchSecondRef = useRef(0);

  const [activePanel, setActivePanel] = useState("comments");

  const [course, setCourse] = useState(null);
  const [accessType, setAccessType] = useState("student");
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

  const [updatingCompletion, setUpdatingCompletion] = useState(false);
  const [lessonCompleteMessage, setLessonCompleteMessage] = useState("");
  const [lessonCompleteError, setLessonCompleteError] = useState("");

  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState("");

  const [videoSource, setVideoSource] = useState("");
  const [videoPlaybackType, setVideoPlaybackType] = useState("mp4");
  const [videoExpiresIn, setVideoExpiresIn] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [notesByLessonId, setNotesByLessonId] = useState({});
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteDeleting, setNoteDeleting] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteError, setNoteError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteEditMode, setNoteEditMode] = useState(false);

  const isStudentLearning = accessType === "student";
  const isAdminLearning = accessType === "adminOwner";

  const lessons = useMemo(() => {
    if (!Array.isArray(course?.sections)) return [];

    return course.sections.flatMap((section) => {
      const sectionLessons = Array.isArray(section?.lessons)
        ? section.lessons
        : [];

      return sectionLessons.map((lesson) => ({
        ...lesson,
        sectionTitle: section.title,
      }));
    });
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

  const currentLessonCompleted = completedLessonIds.has(
    String(currentLesson?._id),
  );

  const currentLessonResourceCount = getLessonResources(currentLesson).length;

  const isCourseCompleted =
    safeProgress.totalLessons > 0 && safeProgress.progressPercentage === 100;

  const clearVideoRefreshTimer = () => {
    if (videoRefreshTimerRef.current) {
      clearTimeout(videoRefreshTimerRef.current);
      videoRefreshTimerRef.current = null;
    }
  };

  const updateNavbarCourseTitle = (title) => {
    if (!title) return;

    localStorage.setItem(LEARNING_COURSE_TITLE_KEY, title);

    window.dispatchEvent(
      new CustomEvent("veolms-learning-course-change", {
        detail: { title },
      }),
    );

    window.dispatchEvent(
      new CustomEvent("veolms-learning-course-title", {
        detail: { title },
      }),
    );
  };

  const clearNavbarCourseTitle = () => {
    localStorage.setItem(LEARNING_COURSE_TITLE_KEY, "");

    window.dispatchEvent(
      new CustomEvent("veolms-learning-course-change", {
        detail: { title: "" },
      }),
    );

    window.dispatchEvent(
      new CustomEvent("veolms-learning-course-title", {
        detail: { title: "" },
      }),
    );
  };

  const focusNoteTypingArea = () => {
    if (!isStudentLearning) return;

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
    if (!isStudentLearning) return;

    const nextOpenState = !notesOpen;

    setNotesOpen(nextOpenState);

    if (nextOpenState) {
      setNoteEditMode(!hasCurrentLessonNote);
    }
  };

  const addTextToNote = (text, block = false) => {
    if (!isStudentLearning) return;

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
    if (!isStudentLearning || !hasCurrentLessonNote) return;

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
    if (!courseId || !isStudentLearning) return;

    try {
      const res = await api.get(`/certificates/course/${courseId}`);
      setCertificate(res.data.certificate || null);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Certificate fetch failed:", error);
      }

      setCertificate(null);
    }
  };

  const fetchCourseNotes = async (courseId) => {
    if (!courseId || !isStudentLearning) return;

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

  const loadLessonWatchPosition = async (lesson) => {
    if (!isStudentLearning || !course?._id || !lesson?._id) {
      setVideoStartTime(0);
      return 0;
    }

    try {
      const response = await api.get(
        `/progress/watch-position/${course._id}/${lesson._id}`,
      );

      const isCompleted = response.data.isCompleted === true;
      const watchPositionSeconds = Number(
        response.data.watchPositionSeconds || 0,
      );
      const durationSeconds = Number(response.data.durationSeconds || 0);

      if (isCompleted) {
        setVideoStartTime(0);
        return 0;
      }

      const safeStartTime =
        durationSeconds > 0
          ? Math.min(watchPositionSeconds, Math.max(0, durationSeconds - 3))
          : watchPositionSeconds;

      setVideoStartTime(safeStartTime);

      return safeStartTime;
    } catch (error) {
      console.error("LOAD_WATCH_POSITION_ERROR:", error);
      setVideoStartTime(0);
      return 0;
    }
  };

  const saveLessonWatchPosition = async ({ currentTime, duration, reason }) => {
    if (!isStudentLearning || !course?._id || !currentLesson?._id) return;

    if (currentLessonCompleted && reason !== "stop") return;

    const safeCurrentTime = Math.max(0, Math.floor(Number(currentTime || 0)));
    const safeDuration = Math.max(0, Math.floor(Number(duration || 0)));

    if (safeCurrentTime < 1 && reason !== "stop") return;

    if (
      reason === "interval" &&
      safeCurrentTime === lastSavedWatchSecondRef.current
    ) {
      return;
    }

    lastSavedWatchSecondRef.current = safeCurrentTime;

    try {
      await api.post("/progress/watch-position", {
        courseId: course._id,
        lessonId: currentLesson._id,
        watchPositionSeconds: safeCurrentTime,
        durationSeconds: safeDuration,
      });
    } catch (error) {
      console.error("SAVE_WATCH_POSITION_ERROR:", error);
    }
  };

  const scheduleSignedVideoRefresh = ({ lesson, expiresIn }) => {
    clearVideoRefreshTimer();

    const delayMs = getSignedVideoRefreshDelayMs(expiresIn);

    if (!delayMs || !lesson?._id) return;

    videoRefreshTimerRef.current = setTimeout(() => {
      loadSecureVideo(lesson, {
        silent: true,
        reason: "auto-refresh",
      });
    }, delayMs);
  };

  const loadSecureVideo = async (lesson, options = {}) => {
    if (!course?._id || !lesson?._id) return;

    const isSilentRefresh = Boolean(options.silent);
    const requestId = activeVideoRequestIdRef.current + 1;
    activeVideoRequestIdRef.current = requestId;

    try {
      clearVideoRefreshTimer();

      if (!isSilentRefresh) {
        setVideoLoading(true);
        setVideoError("");
        setVideoSource("");
        setVideoPlaybackType("mp4");
        setVideoExpiresIn(0);
        setVideoStartTime(0);
        lastSavedWatchSecondRef.current = 0;

        await loadLessonWatchPosition(lesson);
      }

      const shouldTryHls = ENABLE_HLS_PLAYBACK && hasReadyHls(lesson);

      if (shouldTryHls) {
        try {
          const hlsRes = await api.post(
            "/videos/hls-access",
            {
              courseId: course._id,
              lessonId: lesson._id,
            },
            {
              withCredentials: true,
            },
          );

          if (activeVideoRequestIdRef.current !== requestId) return;

          const manifestUrl = hlsRes.data.manifestUrl || "";

          if (manifestUrl) {
            setVideoSource(manifestUrl);
            setVideoPlaybackType("hls");
            setVideoExpiresIn(Number(hlsRes.data.expiresIn || 0));
            return;
          }
        } catch (hlsError) {
          if (import.meta.env.DEV) {
            console.warn("HLS unavailable, falling back to MP4:", {
              status: hlsError?.response?.status,
              message: hlsError?.response?.data?.message,
            });
          }
        }
      }

      const mp4Res = await api.post("/videos/signed-url", {
        courseId: course._id,
        lessonId: lesson._id,
      });

      if (activeVideoRequestIdRef.current !== requestId) return;

      const secureVideoUrl =
        mp4Res.data.videoUrl || mp4Res.data.signedUrl || mp4Res.data.url || "";

      const expiresIn = Number(mp4Res.data.expiresIn || 0);

      if (!secureVideoUrl) {
        throw new Error("Secure video URL not received.");
      }

      setVideoSource(secureVideoUrl);
      setVideoPlaybackType(mp4Res.data.playbackType || "mp4");
      setVideoExpiresIn(expiresIn);

      scheduleSignedVideoRefresh({
        lesson,
        expiresIn,
      });

      if (isSilentRefresh && import.meta.env.DEV) {
        console.info("Secure lesson video URL refreshed.", {
          lessonId: lesson._id,
          expiresIn,
        });
      }
    } catch (error) {
      if (activeVideoRequestIdRef.current !== requestId) return;

      console.error("Failed to load secure video:", error);

      if (!isSilentRefresh) {
        setVideoError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load secure video",
        );

        setVideoSource("");
        setVideoPlaybackType("mp4");
        setVideoExpiresIn(0);
        setVideoStartTime(0);
      } else {
        scheduleSignedVideoRefresh({
          lesson,
          expiresIn: videoExpiresIn || 300,
        });
      }
    } finally {
      if (activeVideoRequestIdRef.current === requestId && !isSilentRefresh) {
        setVideoLoading(false);
      }
    }
  };

  const loadLessonNote = async (lesson) => {
    if (!isStudentLearning || !course?._id || !lesson?._id) return;

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
      if (error.response?.status === 404) {
        setNoteContent("");

        if (notesOpen) {
          setNoteEditMode(true);
        }

        return;
      }

      console.error("LOAD_LESSON_NOTE_ERROR:", error);

      setNoteError(error.response?.data?.message || "Failed to load note");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!isStudentLearning || !course?._id) return;

    try {
      setCertificateLoading(true);
      setCertificateError("");

      const res = await api.post("/certificates/generate", {
        courseId: course._id,
      });

      const generatedCertificate = res.data.certificate;

      setCertificate(generatedCertificate);

      if (generatedCertificate?.certificateId) {
        navigate(`/certificates/${generatedCertificate.certificateId}`);
      }
    } catch (error) {
      console.error("Certificate generation failed:", error);

      setCertificateError(
        error.response?.data?.message || "Failed to generate certificate.",
      );
    } finally {
      setCertificateLoading(false);
    }
  };

  useEffect(() => {
    const fetchLearningCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/enrollments/learn/${slug}`);

        const loadedCourse = res.data.course;
        const loadedAccessType = res.data.accessType || "student";

        setCourse(loadedCourse);
        setAccessType(loadedAccessType);
        updateNavbarCourseTitle(loadedCourse.title);

        const allLessons =
          loadedCourse.sections
            ?.flatMap((section) => {
              const sectionLessons = Array.isArray(section?.lessons)
                ? section.lessons
                : [];

              return sectionLessons.map((lesson) => ({
                ...lesson,
                sectionTitle: section.title,
              }));
            })
            ?.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)) || [];

        let loadedProgress = normalizeProgress({
          totalLessons: allLessons.length,
          completedLessons: 0,
          progressPercentage: 0,
          lessonProgress: [],
          currentLessonId: null,
        });

        if (loadedAccessType === "student") {
          const progressRes = await api.get(
            `/progress/course/${loadedCourse._id}`,
          );

          loadedProgress = normalizeProgress(
            getProgressFromResponse(progressRes),
          );

          const certResPromise = api
            .get(`/certificates/course/${loadedCourse._id}`)
            .then((certRes) => setCertificate(certRes.data.certificate || null))
            .catch((error) => {
              if (error.response?.status !== 404) {
                console.error("Certificate fetch failed:", error);
              }

              setCertificate(null);
            });

          const notesResPromise = api
            .get(`/notes/course/${loadedCourse._id}`)
            .then((notesRes) => {
              const notes = Array.isArray(notesRes.data.notes)
                ? notesRes.data.notes
                : [];

              const noteMap = {};

              notes.forEach((note) => {
                if (note.lessonId) {
                  noteMap[String(note.lessonId)] = note.content || "";
                }
              });

              setNotesByLessonId(noteMap);
            })
            .catch((error) => {
              console.error("FETCH_COURSE_NOTES_ERROR:", error);
              setNotesByLessonId({});
            });

          await Promise.allSettled([certResPromise, notesResPromise]);
        } else {
          setCertificate(null);
          setNotesByLessonId({});
          setNoteContent("");
          setNotesOpen(false);
          setNoteEditMode(false);
        }

        setProgress(loadedProgress);

        const resumeLesson =
          loadedAccessType === "student"
            ? allLessons.find(
                (lesson) =>
                  String(lesson._id) === String(loadedProgress.currentLessonId),
              ) || allLessons[0]
            : allLessons[0];

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

      if (isStudentLearning) {
        loadLessonNote(currentLesson);
      } else {
        setNoteContent("");
        setNoteMessage("");
        setNoteError("");
        setNotesOpen(false);
        setNoteEditMode(false);
      }
    }
  }, [course?._id, currentLesson?._id, isStudentLearning]);

  useEffect(() => {
    return () => {
      clearVideoRefreshTimer();
      clearNavbarCourseTitle();
    };
  }, []);

  const refreshProgress = async () => {
    if (!isStudentLearning || !course?._id) return;

    const progressRes = await api.get(`/progress/course/${course._id}`);
    const loadedProgress = getProgressFromResponse(progressRes);

    setProgress(normalizeProgress(loadedProgress));
  };

  const handleLessonClick = async (lesson, sectionTitle) => {
    try {
      clearVideoRefreshTimer();
      lastSavedWatchSecondRef.current = 0;
      setVideoStartTime(0);

      setCurrentLesson({
        ...lesson,
        sectionTitle,
      });

      setActivePanel("comments");
      setLessonCompleteMessage("");
      setLessonCompleteError("");
      setCertificateError("");

      if (!isStudentLearning) {
        return;
      }

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: lesson._id,
        isCompleted: completedLessonIds.has(String(lesson._id)),
      });

      await refreshProgress();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleLessonComplete = async () => {
    if (!isStudentLearning || !course?._id || !currentLesson?._id) return;

    const nextCompletedState = !currentLessonCompleted;

    try {
      setUpdatingCompletion(true);
      setLessonCompleteMessage("");
      setLessonCompleteError("");
      setCertificateError("");

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: currentLesson._id,
        isCompleted: nextCompletedState,
      });

      await refreshProgress();

      if (!nextCompletedState) {
        setCertificate(null);
      } else {
        setVideoStartTime(0);
        lastSavedWatchSecondRef.current = 0;
        await fetchCertificateForCourse(course._id);
      }

      setLessonCompleteMessage(
        nextCompletedState
          ? "Lesson marked as completed."
          : "Lesson unmarked. Progress updated.",
      );
    } catch (error) {
      console.error("TOGGLE_LESSON_COMPLETE_ERROR:", error);

      setLessonCompleteError(
        error.response?.data?.message ||
          "Unable to update lesson progress. Please try again.",
      );
    } finally {
      setUpdatingCompletion(false);
    }
  };

  const handleSaveNote = async () => {
    if (!isStudentLearning || !course?._id || !currentLesson?._id) return;

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
    if (!isStudentLearning || !course?._id || !currentLesson?._id) return;

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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-4 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2
            className="animate-spin text-blue-500 dark:text-blue-400"
            size={24}
          />
          Loading learning page...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-4 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 dark:border-red-500/30 dark:bg-red-500/10">
          <h1 className="mb-3 text-3xl font-black text-red-700 dark:text-red-300">
            Access Denied
          </h1>

          <p className="mb-6 text-slate-700 dark:text-slate-300">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 md:px-6">
        {isAdminLearning && (
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            Admin preview mode: you are viewing your own course learning page.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
              {videoLoading ? (
                <div className="flex aspect-video flex-col items-center justify-center bg-black text-slate-400">
                  <Loader2 className="animate-spin text-blue-400" size={36} />

                  <p className="mt-3 font-semibold">
                    Preparing secure video...
                  </p>
                </div>
              ) : videoError ? (
                <div className="flex aspect-video items-center justify-center bg-black px-4 text-center text-red-300">
                  {videoError}
                </div>
              ) : videoSource ? (
                <VideoPlayer
                  key={`${currentLesson?._id}-${videoPlaybackType}`}
                  src={videoSource}
                  type={videoPlaybackType}
                  startTime={videoStartTime}
                  title={currentLesson?.title}
                  progressSaveIntervalSeconds={10}
                  onProgressSave={saveLessonWatchPosition}
                  onEnded={() => {
                    if (isStudentLearning && !currentLessonCompleted) {
                      handleToggleLessonComplete();
                    }
                  }}
                  onError={(message) => {
                    console.error("VIDEO_PLAYER_ERROR:", message);
                  }}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-black text-slate-400">
                  No video selected
                </div>
              )}

              <div className="p-6">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                    {currentLesson?.sectionTitle}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {videoStartTime > 0 && !currentLessonCompleted && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                        Resuming from saved position
                      </span>
                    )}

                    {videoPlaybackType !== "hls" && videoExpiresIn > 0 && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
                        Secure URL auto-refresh enabled
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="mb-3 text-2xl font-black leading-tight text-slate-950 md:text-3xl dark:text-white">
                  {currentLesson?.title}
                </h2>

                <p className="text-slate-600 dark:text-slate-400">
                  {isAdminLearning
                    ? "Preview your lesson, check resources, and reply to student comments."
                    : "Watch this lesson and continue through the course curriculum."}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <TabButton
                    active={activePanel === "comments"}
                    icon={MessageCircle}
                    label="Discussion"
                    onClick={() => setActivePanel("comments")}
                  />

                  <TabButton
                    active={activePanel === "resources"}
                    icon={Paperclip}
                    label="Resources"
                    badge={currentLessonResourceCount}
                    onClick={() => setActivePanel("resources")}
                  />

                  {isStudentLearning && (
                    <button
                      type="button"
                      onClick={handleToggleLessonComplete}
                      disabled={updatingCompletion}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                        currentLessonCompleted
                          ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-400/30 dark:bg-green-500/15 dark:text-green-200 dark:hover:bg-green-500/25"
                          : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-100 dark:hover:bg-green-500/20"
                      } disabled:cursor-not-allowed disabled:opacity-80`}
                    >
                      {updatingCompletion ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle size={17} />
                      )}

                      {updatingCompletion
                        ? "Updating..."
                        : currentLessonCompleted
                          ? "Completed"
                          : "Mark Lesson"}
                    </button>
                  )}
                </div>

                {isStudentLearning && lessonCompleteMessage && (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200">
                    {lessonCompleteMessage}
                  </div>
                )}

                {isStudentLearning && lessonCompleteError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    {lessonCompleteError}
                  </div>
                )}

                {isStudentLearning && certificateError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    {certificateError}
                  </div>
                )}

                {isStudentLearning && isCourseCompleted && (
                  <div className="mt-5 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-400/20 dark:bg-yellow-500/10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                          <Award size={25} />
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-yellow-800 dark:text-yellow-200">
                            Course Completed
                          </h3>

                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                            You completed all lessons. You can now generate or
                            download your certificate.
                          </p>
                        </div>
                      </div>

                      {certificate?.certificateId ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/certificates/${certificate.certificateId}`,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-700"
                        >
                          <Download size={17} />
                          View / Download Certificate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateCertificate}
                          disabled={certificateLoading}
                          className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {certificateLoading ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <Award size={17} />
                          )}
                          {certificateLoading
                            ? "Generating..."
                            : "Generate Certificate"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activePanel === "comments" &&
                  course?._id &&
                  currentLesson?._id && (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                      <LessonComments
                        courseId={course._id}
                        lessonId={currentLesson._id}
                      />
                    </div>
                  )}

                {activePanel === "resources" && (
                  <LessonResources
                    courseId={course?._id}
                    lesson={currentLesson}
                  />
                )}
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
            <div className="border-b border-slate-200 p-5 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black leading-tight text-slate-950 dark:text-white">
                      Course Lessons
                    </h3>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {lessons.length} lessons
                    </p>
                  </div>
                </div>

                {isStudentLearning && (
                  <button
                    type="button"
                    onClick={toggleNotesPanel}
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                      notesOpen
                        ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                    title="Lesson notes"
                  >
                    {notesOpen ? <X size={21} /> : <FileText size={21} />}

                    {hasCurrentLessonNote && !notesOpen && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {isStudentLearning && notesOpen && (
              <div className="border-b border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/80">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
                    Lesson Notes
                  </p>

                  {noteLoading && (
                    <Loader2
                      className="animate-spin text-blue-500 dark:text-blue-400"
                      size={18}
                    />
                  )}
                </div>

                {noteError && (
                  <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    {noteError}
                  </div>
                )}

                {noteMessage && (
                  <div className="mb-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
                    {noteMessage}
                  </div>
                )}

                {hasCurrentLessonNote && !noteEditMode ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-blue-700 dark:bg-white/5 dark:text-blue-300">
                          <FileText size={22} />
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                            Saved Note
                          </p>

                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Click note text or Edit to continue writing
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadNote}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
                      className="w-full cursor-text rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-white/10 dark:bg-white/[0.03]"
                      title="Click to edit note"
                    >
                      <NotePreview content={noteContent} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      disabled={noteDeleting || noteLoading}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                        >
                          H1 Heading
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("h2")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                        >
                          H2 Sub
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("point")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          • Point
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("doubt")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Doubt
                        </button>

                        <button
                          type="button"
                          onClick={() => addFormatToNote("summary")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
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
                      className="w-full resize-none rounded-3xl border border-slate-200 bg-white px-5 py-4 text-[15px] leading-7 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/50"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={noteSaving || noteLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save size={16} />
                        {noteSaving ? "Saving..." : "Save"}
                      </button>

                      {noteContent.trim() && (
                        <button
                          type="button"
                          onClick={handleDownloadNote}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          <Download size={16} />
                          Download
                        </button>
                      )}

                      {hasCurrentLessonNote && (
                        <button
                          type="button"
                          onClick={() => setNoteEditMode(false)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
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
                <div
                  key={section._id}
                  className="border-b border-slate-200 dark:border-white/10"
                >
                  <div className="bg-slate-50 px-5 py-4 dark:bg-slate-950/60">
                    <h4 className="text-lg font-black text-slate-950 dark:text-white">
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
                          type="button"
                          onClick={() =>
                            handleLessonClick(lesson, section.title)
                          }
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isActive
                              ? "border-blue-500 bg-blue-50 dark:border-blue-500/70 dark:bg-blue-600/20"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 shrink-0 ${
                                isStudentLearning && isCompleted
                                  ? "text-green-700 dark:text-green-300"
                                  : isActive
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {isStudentLearning && isCompleted ? (
                                <CheckCircle size={18} />
                              ) : (
                                <PlayCircle size={18} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-base font-black leading-6 text-slate-950 dark:text-white">
                                {lesson.title}
                              </p>

                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                {lesson.duration}
                              </p>
                            </div>

                            {isStudentLearning && lessonHasNote && (
                              <FileText
                                size={18}
                                className="mt-1 shrink-0 text-blue-700 dark:text-blue-300"
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
