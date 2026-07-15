import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Download,
  Edit3,
  FileText,
  Loader2,
  Lock,
  MessageCircle,
  Paperclip,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  PlayCircle,
  Save,
  Trash2,
  Volume2,
  VolumeX,
  Maximize2,
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

const getAccessExpiresInSeconds = (accessData = {}) => {
  const directExpiresIn = Number(
    accessData?.expiresIn || accessData?.cookieExpiresIn || 0,
  );

  if (directExpiresIn > 0) return directExpiresIn;

  if (!accessData?.expiresAt) return 0;

  const expiresAtMs = new Date(accessData.expiresAt).getTime();

  if (!Number.isFinite(expiresAtMs)) return 0;

  return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
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

const clampPercentage = (value) => {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.min(100, Math.max(0, Math.round(numberValue)));
};

const getProgressLessonId = (item = {}) => {
  return String(
    item?.lessonId?._id ||
      item?.lessonId ||
      item?.lesson?._id ||
      item?.lesson ||
      "",
  );
};

const getLessonProgressItem = ({ lessonProgress = [], lessonId }) => {
  const safeLessonId = String(lessonId || "");

  if (!safeLessonId || !Array.isArray(lessonProgress)) return null;

  return (
    lessonProgress.find((item) => getProgressLessonId(item) === safeLessonId) ||
    null
  );
};

const getLessonProgressPercentage = ({
  lesson,
  lessonProgress = [],
  isCompleted = false,
}) => {
  if (isCompleted) return 100;

  const lessonId = String(lesson?._id || lesson?.id || "");
  const progressItem = getLessonProgressItem({
    lessonProgress,
    lessonId,
  });

  if (!progressItem) return 0;

  const directPercentage =
    progressItem.progressPercentage ??
    progressItem.watchPercentage ??
    progressItem.percentage ??
    progressItem.completedPercentage;

  if (directPercentage !== undefined && directPercentage !== null) {
    return clampPercentage(directPercentage);
  }

  const watchedSeconds = Number(
    progressItem.watchPositionSeconds ||
      progressItem.currentTime ||
      progressItem.currentTimeSeconds ||
      progressItem.watchedSeconds ||
      progressItem.watchTime ||
      progressItem.lastPosition ||
      progressItem.lastWatchedSecond ||
      0,
  );

  const totalSeconds = Number(
    progressItem.durationSeconds ||
      progressItem.duration ||
      lesson?.durationSeconds ||
      0,
  );

  if (watchedSeconds > 0 && totalSeconds > 0) {
    return clampPercentage((watchedSeconds / totalSeconds) * 100);
  }

  return 0;
};

const getSectionProgressPercentage = ({
  section,
  lessonProgress = [],
  completedLessonIds,
}) => {
  const sectionLessons = Array.isArray(section?.lessons) ? section.lessons : [];

  if (!sectionLessons.length) return 0;

  const totalPercentage = sectionLessons.reduce((total, lesson) => {
    const lessonId = String(lesson?._id || "");
    const isCompleted = completedLessonIds?.has(lessonId);

    return (
      total +
      getLessonProgressPercentage({
        lesson,
        lessonProgress,
        isCompleted,
      })
    );
  }, 0);

  return clampPercentage(totalPercentage / sectionLessons.length);
};

const getSectionKey = (section, index) => {
  return String(section?._id || section?.title || `section-${index}`);
};

const getInitialOpenSectionKey = ({ sections = [], currentLesson }) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  const currentLessonId = String(currentLesson?._id || "");

  if (!safeSections.length) return "";

  if (!currentLessonId) {
    return getSectionKey(safeSections[0], 0);
  }

  const activeSectionIndex = safeSections.findIndex((section) => {
    return Array.isArray(section?.lessons)
      ? section.lessons.some(
          (lesson) => String(lesson?._id || "") === currentLessonId,
        )
      : false;
  });

  if (activeSectionIndex >= 0) {
    return getSectionKey(safeSections[activeSectionIndex], activeSectionIndex);
  }

  return getSectionKey(safeSections[0], 0);
};

const getInitialOpenSectionKeys = ({ sections = [], currentLesson }) => {
  const firstOpenKey = getInitialOpenSectionKey({ sections, currentLesson });

  return firstOpenKey ? [firstOpenKey] : [];
};

const toggleSectionKeyInList = (currentKeys = [], sectionKey) => {
  const safeKeys = Array.isArray(currentKeys) ? currentKeys : [];

  if (!sectionKey) return safeKeys;

  if (safeKeys.includes(sectionKey)) {
    return safeKeys.filter((key) => key !== sectionKey);
  }

  return [...safeKeys, sectionKey];
};

const ProgressCircle = ({
  percentage = 0,
  isCompleted = false,
  isActive = false,
  size = 54,
}) => {
  const safePercentage = clampPercentage(percentage);
  const radius = 20;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      title={`${safePercentage}% completed`}
      aria-label={`${safePercentage}% completed`}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-white/10"
        />

        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={
            isCompleted
              ? "stroke-green-500"
              : isActive
                ? "stroke-violet-500"
                : "stroke-blue-500"
          }
        />
      </svg>

      <div
        className={`absolute inset-1 flex items-center justify-center rounded-full text-[10px] font-black ${
          isCompleted
            ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
            : isActive
              ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
              : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
        }`}
      >
        {isCompleted ? <CheckCircle size={15} /> : `${safePercentage}%`}
      </div>
    </div>
  );
};

const CourseProgressCompact = ({ safeProgress }) => {
  const percentage = clampPercentage(safeProgress?.progressPercentage || 0);
  const completedLessons = Number(safeProgress?.completedLessons || 0);
  const totalLessons = Number(safeProgress?.totalLessons || 0);

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
        <ProgressCircle
          percentage={percentage}
          isCompleted={totalLessons > 0 && completedLessons === totalLessons}
          isActive
          size={50}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              Entire video progress
            </p>

            <span className="shrink-0 text-xs font-black text-violet-700 dark:text-violet-300">
              {percentage}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {completedLessons}/{totalLessons} lessons completed
          </p>
        </div>
      </div>
    </div>
  );
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

const useMediaQuery = (query) => {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(query);

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
};

const MobileLearningTabButton = ({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 px-2 py-4 text-xs font-black transition sm:text-sm ${
        active
          ? "text-violet-700 dark:text-violet-300"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="truncate">{label}</span>

      {badge !== undefined && badge !== null && Number(badge) > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
            active
              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
          }`}
        >
          {badge}
        </span>
      )}

      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-violet-600 dark:bg-violet-400" />
      )}
    </button>
  );
};

const formatVideoTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getUniqueHlsQualityLevels = (levels = []) => {
  const bestLevelByHeight = new Map();

  levels.forEach((level, index) => {
    const height = Number(level?.height || 0);
    const bitrate = Number(level?.bitrate || 0);

    if (!height) return;

    const existingLevel = bestLevelByHeight.get(height);

    if (!existingLevel || bitrate > existingLevel.bitrate) {
      bestLevelByHeight.set(height, {
        index,
        height,
        bitrate,
        label: `${height}p`,
      });
    }
  });

  return [...bestLevelByHeight.values()].sort((a, b) => b.height - a.height);
};

const MobileVideoPlayer = ({
  src,
  type = "mp4",
  title,
  startTime = 0,
  progressSaveIntervalSeconds = 10,
  onProgressSave,
  onEnded,
  onError,
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const hideControlsTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [localError, setLocalError] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [qualityLevels, setQualityLevels] = useState([]);
  const [activeAutoQuality, setActiveAutoQuality] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const isHlsSource =
    type === "hls" ||
    String(src || "")
      .toLowerCase()
      .includes(".m3u8");

  const speedOptions = [0.75, 1, 1.25, 1.5, 1.75, 2];

  const clearHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  };

  const saveCurrentProgress = (reason = "manual") => {
    const video = videoRef.current;

    if (!video || !onProgressSave) return;

    onProgressSave({
      currentTime: video.currentTime,
      duration: video.duration,
      reason,
    });
  };

  const startAutoHideControls = () => {
    clearHideControlsTimer();

    const video = videoRef.current;

    if (!video || video.paused) return;

    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2600);
  };

  const revealControls = () => {
    setShowControls(true);
    startAutoHideControls();
  };

  const holdControlsOpen = (event) => {
    event?.stopPropagation?.();
    setShowControls(true);
    clearHideControlsTimer();
  };

  const releaseControls = (event) => {
    event?.stopPropagation?.();
    startAutoHideControls();
  };

  const playVideo = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      setLocalError("");
      await video.play();
      setShowControls(true);
      startAutoHideControls();
    } catch (error) {
      console.error("MOBILE_VIDEO_PLAY_ERROR:", error);
      setLocalError("Tap once more to start the video.");
      onError?.("Tap once more to start the video.");
    }
  };

  const pauseVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    setShowControls(true);
    clearHideControlsTimer();
  };

  const handleVideoTap = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      playVideo();
      return;
    }

    if (!showControls) {
      revealControls();
      return;
    }

    startAutoHideControls();
  };

  const seekToPercent = (event) => {
    const video = videoRef.current;

    if (!video || !duration) return;

    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = event.clientX || event.touches?.[0]?.clientX || 0;
    const clickX = clientX - rect.left;
    const nextTime = Math.min(
      duration,
      Math.max(0, (clickX / rect.width) * duration),
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    revealControls();
    saveCurrentProgress("seek");
  };

  const seekBySeconds = (seconds, event) => {
    event?.stopPropagation?.();

    const video = videoRef.current;

    if (!video) return;

    const safeDuration = Number.isFinite(video.duration)
      ? video.duration
      : duration;
    const nextTime = Math.min(
      safeDuration || 0,
      Math.max(0, Number(video.currentTime || 0) + Number(seconds || 0)),
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    revealControls();
    saveCurrentProgress("seek");
  };

  const handleSpeedSelect = (event) => {
    event.stopPropagation();

    const nextRate = Number(event.target.value || 1);
    const video = videoRef.current;

    if (video) {
      video.playbackRate = nextRate;
    }

    setPlaybackRate(nextRate);
    releaseControls(event);
  };

  const handleQualitySelect = (event) => {
    event.stopPropagation();

    const value = event.target.value;
    setSelectedQuality(value);

    const hls = hlsRef.current;

    if (hls) {
      if (value === "auto") {
        hls.currentLevel = -1;
        hls.loadLevel = -1;
      } else {
        const levelIndex = Number(value);

        if (Number.isFinite(levelIndex)) {
          hls.currentLevel = levelIndex;
          hls.loadLevel = levelIndex;
        }
      }
    }

    releaseControls(event);
  };

  const handleVolumeToggle = (event) => {
    event.stopPropagation();

    const video = videoRef.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setIsMuted(nextMuted);
    revealControls();
  };

  const handleVolumeChange = (event) => {
    event.stopPropagation();

    const nextVolume = Number(event.target.value);
    const video = videoRef.current;

    if (!video) return;

    video.volume = nextVolume;
    video.muted = nextVolume === 0;

    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    revealControls();
  };

  const handleFullscreen = (event) => {
    event.stopPropagation();

    const container = videoRef.current?.closest("[data-mobile-video-shell]");

    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }

    container.requestFullscreen?.();
    revealControls();
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) return undefined;

    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setShowControls(true);
    setLocalError("");
    setQualityLevels([]);
    setSelectedQuality("auto");
    setActiveAutoQuality("");
    clearHideControlsTimer();

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();
    video.playbackRate = playbackRate;
    video.volume = volume;
    video.muted = isMuted;

    const applyStartTime = () => {
      const safeDuration = Number.isFinite(video.duration) ? video.duration : 0;
      const safeStartTime = Math.max(0, Number(startTime || 0));

      setDuration(safeDuration);

      if (safeStartTime > 0 && safeDuration > 0) {
        video.currentTime = Math.min(
          safeStartTime,
          Math.max(0, safeDuration - 2),
        );
      }
    };

    const handleLoadedMetadata = () => {
      applyStartTime();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setShowControls(true);
      startAutoHideControls();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
      clearHideControlsTimer();
      saveCurrentProgress("pause");
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      clearHideControlsTimer();
      saveCurrentProgress("ended");
      onEnded?.();
    };

    const handleError = () => {
      const message = "Video URL or format is not supported.";
      setLocalError(message);
      setShowControls(true);
      onError?.(message);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    if (isHlsSource) {
      video.crossOrigin = "use-credentials";

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = getUniqueHlsQualityLevels(hls.levels || []);

          console.log("MOBILE_HLS_LEVELS_READY:", levels);

          setQualityLevels(levels);
          setSelectedQuality("auto");
          applyStartTime();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const activeLevel = hls.levels?.[data.level];

          if (activeLevel?.height) {
            setActiveAutoQuality(`${activeLevel.height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("MOBILE_HLS_PLAYER_ERROR:", data);

          if (!data?.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }

          const message = data?.details || "Unable to play HLS video.";
          setLocalError(message);
          setShowControls(true);
          onError?.(message);
          hls.destroy();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.load();
      } else {
        const message = "This browser does not support HLS playback.";
        setLocalError(message);
        onError?.(message);
      }
    } else {
      video.removeAttribute("crossorigin");
      video.src = src;
      video.load();
    }

    return () => {
      saveCurrentProgress("unmount");
      clearHideControlsTimer();
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, type, startTime]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!isPlaying || !onProgressSave) return undefined;

    saveIntervalRef.current = setInterval(
      () => {
        saveCurrentProgress("interval");
      },
      Math.max(5, Number(progressSaveIntervalSeconds || 10)) * 1000,
    );

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [isPlaying, onProgressSave, progressSaveIntervalSeconds]);

  useEffect(() => {
    return () => {
      clearHideControlsTimer();

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const progressPercent = duration
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  return (
    <div
      data-mobile-video-shell
      className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-black"
    >
      <button
        type="button"
        onClick={handleVideoTap}
        onTouchStart={() => {
          if (!isPlaying) return;
          revealControls();
        }}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer bg-transparent text-left"
        aria-label={isPlaying ? "Show video controls" : "Play video"}
      >
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          playsInline
          preload="metadata"
          controls={false}
          controlsList="nodownload noplaybackrate nofullscreen"
          disablePictureInPicture
          aria-label={title || "Lesson video"}
          crossOrigin={isHlsSource ? "use-credentials" : undefined}
        />
      </button>

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-sm">
            <Play size={30} fill="currentColor" />
          </div>
        </div>
      )}

      {localError && (
        <div className="absolute left-3 right-3 top-3 z-30 rounded-2xl border border-red-400/30 bg-red-950/85 px-4 py-3 text-center text-xs font-bold text-red-100 backdrop-blur">
          {localError}
        </div>
      )}

      <div
        onMouseMove={revealControls}
        onTouchStart={revealControls}
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 ${
          showControls || !isPlaying
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={seekToPercent}
          onTouchStart={holdControlsOpen}
          onTouchEnd={releaseControls}
          className="mb-2.5 block h-4 w-full rounded-full"
          aria-label="Seek video"
        >
          <span className="relative block h-1 overflow-hidden rounded-full bg-white/35">
            <span
              className="block h-full rounded-full bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </span>
        </button>

        <div className="flex w-full items-center justify-between gap-1.5 text-white min-[390px]:gap-2">
          <div className="flex shrink-0 items-center gap-1 min-[390px]:gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isPlaying) {
                  pauseVideo();
                } else {
                  playVideo();
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 min-[430px]:h-9 min-[430px]:w-9"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              onClick={(event) => seekBySeconds(-10, event)}
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 min-[430px]:h-8 min-[430px]:w-8"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={13} />
              <span className="absolute text-[7px] font-black leading-none">
                10
              </span>
            </button>

            <button
              type="button"
              onClick={(event) => seekBySeconds(10, event)}
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 min-[430px]:h-8 min-[430px]:w-8"
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={13} />
              <span className="absolute text-[7px] font-black leading-none">
                10
              </span>
            </button>

            <p className="hidden w-[66px] shrink-0 truncate text-[10px] font-black tabular-nums text-white/95 min-[560px]:block">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1 min-[390px]:gap-1.5 min-[430px]:px-2">
            <select
              value={String(playbackRate)}
              onClick={(event) => event.stopPropagation()}
              onFocus={holdControlsOpen}
              onBlur={releaseControls}
              onChange={handleSpeedSelect}
              className="h-8 w-[50px] shrink-0 rounded-xl border border-white/15 bg-slate-900/95 px-1.5 text-[11px] font-black text-white outline-none backdrop-blur focus:border-blue-400 min-[430px]:w-[56px]"
              aria-label="Playback speed"
            >
              {speedOptions.map((speed) => (
                <option
                  key={speed}
                  value={speed}
                  className="bg-slate-900 text-white"
                >
                  {speed}x
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleVolumeToggle}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={15} />
              ) : (
                <Volume2 size={15} />
              )}
            </button>

            <div className="flex h-8 min-w-[46px] max-w-[82px] flex-1 items-center rounded-full bg-black/40 px-2 backdrop-blur min-[430px]:max-w-[96px] min-[560px]:max-w-[120px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onClick={(event) => event.stopPropagation()}
                onTouchStart={holdControlsOpen}
                onTouchEnd={releaseControls}
                onMouseDown={holdControlsOpen}
                onMouseUp={releaseControls}
                onChange={handleVolumeChange}
                className="h-1.5 w-full accent-blue-500"
                aria-label="Volume"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 min-[390px]:gap-1.5">
            <select
              value={selectedQuality}
              onClick={(event) => event.stopPropagation()}
              onFocus={holdControlsOpen}
              onBlur={releaseControls}
              onChange={handleQualitySelect}
              className="h-8 w-[62px] shrink-0 rounded-xl border border-white/15 bg-slate-900/95 px-1.5 text-[11px] font-black text-white outline-none backdrop-blur focus:border-blue-400 min-[430px]:w-[72px]"
              aria-label="Video quality"
            >
              <option value="auto" className="bg-slate-900 text-white">
                {activeAutoQuality ? `Auto ${activeAutoQuality}` : "Auto"}
              </option>

              {qualityLevels.map((level) => (
                <option
                  key={`${level.index}-${level.label}`}
                  value={String(level.index)}
                  className="bg-slate-900 text-white"
                >
                  {level.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleFullscreen}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              aria-label="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileLessonRow = ({
  lesson,
  lessonNumber,
  sectionTitle,
  isActive,
  isCompleted,
  hasNote,
  progressPercentage = 0,
  onClick,
}) => {
  const isLocked = Boolean(lesson?.isLocked || lesson?.locked);
  const safeProgress = clampPercentage(progressPercentage);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        isActive
          ? "border-violet-200 bg-violet-50/90 shadow-sm shadow-violet-200/50 dark:border-violet-400/40 dark:bg-violet-500/15 dark:shadow-none"
          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
      } ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            isCompleted
              ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300"
              : isActive
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          }`}
        >
          {lessonNumber}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {lesson?.title || `Lesson ${lessonNumber}`}
          </p>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                <PlayCircle size={13} />
                Now Playing
              </span>
            ) : sectionTitle ? (
              <span className="truncate">{sectionTitle}</span>
            ) : (
              <span>Video Lesson</span>
            )}

            {hasNote && (
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300">
                <FileText size={13} />
                Note
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <ProgressCircle
              percentage={safeProgress}
              isCompleted={isCompleted}
              isActive={isActive}
              size={46}
            />

            <div className="min-w-0 flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted
                      ? "bg-green-500"
                      : isActive
                        ? "bg-violet-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${safeProgress}%` }}
                />
              </div>

              <p className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
                {safeProgress}% completed
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {lesson?.duration && (
            <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {lesson.duration}
            </span>
          )}

          {isLocked ? (
            <Lock size={17} className="text-slate-500 dark:text-slate-400" />
          ) : isCompleted ? (
            <CheckCircle
              size={18}
              className="text-green-600 dark:text-green-300"
            />
          ) : isActive ? (
            <span className="flex h-6 w-6 items-end justify-center gap-0.5 text-violet-600 dark:text-violet-300">
              <span className="h-2 w-1 rounded-full bg-current" />
              <span className="h-4 w-1 rounded-full bg-current" />
              <span className="h-3 w-1 rounded-full bg-current" />
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

const MobileLearningView = ({
  course,
  currentLesson,
  lessons,
  completedLessonIds,
  lessonProgress,
  safeProgress,
  activePanel,
  setActivePanel,
  videoSource,
  videoPlaybackType,
  videoStartTime,
  videoLoading,
  videoError,
  videoExpiresIn,
  currentLessonCompleted,
  updatingCompletion,
  lessonCompleteMessage,
  lessonCompleteError,
  certificateError,
  isStudentLearning,
  isAdminLearning,
  currentLessonResourceCount,
  notesByLessonId,
  hasCurrentLessonNote,
  noteTextareaRef,
  noteContent,
  noteLoading,
  noteSaving,
  noteDeleting,
  noteMessage,
  noteError,
  onNoteContentChange,
  onSaveNote,
  onDownloadNote,
  onDeleteNote,
  onLessonClick,
  onToggleLessonComplete,
  onSaveWatchPosition,
  onVideoEnded,
  onVideoError,
}) => {
  const [mobilePanel, setMobilePanel] = useState("lessons");

  const openPanel = (panel) => {
    setMobilePanel(panel);

    if (panel === "comments" || panel === "resources") {
      setActivePanel(panel);
    }
  };

  const allLessons = Array.isArray(lessons) ? lessons : [];

  const [openSectionKeys, setOpenSectionKeys] = useState(() => {
    return getInitialOpenSectionKeys({
      sections: course?.sections,
      currentLesson,
    });
  });

  useEffect(() => {
    setOpenSectionKeys((currentKeys) => {
      if (Array.isArray(currentKeys) && currentKeys.length > 0) {
        return currentKeys;
      }

      return getInitialOpenSectionKeys({
        sections: course?.sections,
        currentLesson,
      });
    });
  }, [course?._id, currentLesson?._id]);

  const toggleSection = (section, sectionIndex) => {
    const sectionKey = getSectionKey(section, sectionIndex);

    setOpenSectionKeys((currentKeys) => {
      return toggleSectionKeyInList(currentKeys, sectionKey);
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-8 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white lg:hidden">
      <section className="mx-auto max-w-3xl px-3 py-3 sm:px-4">
        {isAdminLearning && (
          <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            Admin preview mode: you are viewing your own course learning page.
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-violet-700 dark:text-violet-300">
              {course?.title || "Course"}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {safeProgress.progressPercentage}% complete
              </span>

              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${safeProgress.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
          >
            <MoreVertical size={21} />
          </button>
        </div>

        <div className="sticky top-[76px] z-40 -mx-3 bg-slate-50/95 px-3 pb-3 pt-2 backdrop-blur-xl dark:bg-slate-950/95 sm:-mx-4 sm:px-4">
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
            {videoLoading ? (
              <div className="flex aspect-video flex-col items-center justify-center bg-black text-slate-400">
                <Loader2 className="animate-spin text-blue-400" size={34} />
                <p className="mt-3 text-sm font-semibold">
                  Preparing secure video...
                </p>
              </div>
            ) : videoError ? (
              <div className="flex aspect-video items-center justify-center bg-black px-4 text-center text-sm font-bold text-red-300">
                {videoError}
              </div>
            ) : videoSource ? (
              <MobileVideoPlayer
                key={`mobile-${currentLesson?._id}-${videoPlaybackType}`}
                src={videoSource}
                type={videoPlaybackType}
                startTime={videoStartTime}
                title={currentLesson?.title}
                progressSaveIntervalSeconds={10}
                onProgressSave={onSaveWatchPosition}
                onEnded={onVideoEnded}
                onError={onVideoError}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black text-sm font-bold text-slate-400">
                No video selected
              </div>
            )}
          </article>
        </div>

        <article className="mt-3 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
          <div className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-[70%] truncate text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                {currentLesson?.sectionTitle || "Current Lesson"}
              </p>

              {videoPlaybackType !== "hls" && videoExpiresIn > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  Secure video
                </span>
              )}
            </div>

            <h1 className="text-xl font-black leading-tight text-slate-950 dark:text-white">
              {currentLesson?.title || "Lesson"}
            </h1>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
              {isAdminLearning
                ? "Preview your lesson, check resources, and reply to student comments."
                : "Watch this lesson, mark it complete, and continue your learning path."}
            </p>

            {isStudentLearning && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onToggleLessonComplete}
                  disabled={updatingCompletion}
                  className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    currentLessonCompleted
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-500/15 dark:text-green-200"
                      : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {updatingCompletion ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {updatingCompletion
                    ? "Updating..."
                    : currentLessonCompleted
                      ? "Completed"
                      : "Mark as Complete"}
                </button>
              </div>
            )}

            {lessonCompleteMessage && isStudentLearning && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-xs font-bold text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200">
                {lessonCompleteMessage}
              </div>
            )}

            {lessonCompleteError && isStudentLearning && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {lessonCompleteError}
              </div>
            )}

            {certificateError && isStudentLearning && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {certificateError}
              </div>
            )}
          </div>
        </article>

        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
          <div
            className={`grid border-b border-slate-200 dark:border-white/10 ${
              isStudentLearning ? "grid-cols-4" : "grid-cols-3"
            }`}
          >
            <MobileLearningTabButton
              active={mobilePanel === "lessons"}
              icon={BookOpen}
              label="Lessons"
              onClick={() => openPanel("lessons")}
            />

            <MobileLearningTabButton
              active={mobilePanel === "comments"}
              icon={MessageCircle}
              label="Comments"
              onClick={() => openPanel("comments")}
            />

            <MobileLearningTabButton
              active={mobilePanel === "resources"}
              icon={FileText}
              label="Resources"
              badge={currentLessonResourceCount}
              onClick={() => openPanel("resources")}
            />

            {isStudentLearning && (
              <MobileLearningTabButton
                active={mobilePanel === "notes"}
                icon={FileText}
                label="Notes"
                badge={hasCurrentLessonNote ? "•" : null}
                onClick={() => openPanel("notes")}
              />
            )}
          </div>

          {mobilePanel === "lessons" && (
            <div className="space-y-3 p-3">
              {course?.sections?.map((section, sectionIndex) => {
                const sectionKey = getSectionKey(section, sectionIndex);
                const isOpen = openSectionKeys.includes(sectionKey);
                const sectionLessons = Array.isArray(section?.lessons)
                  ? section.lessons
                  : [];
                const sectionPercentage = getSectionProgressPercentage({
                  section,
                  lessonProgress,
                  completedLessonIds,
                });
                const completedInSection = sectionLessons.filter((lesson) =>
                  completedLessonIds.has(String(lesson?._id || "")),
                ).length;

                return (
                  <article
                    key={sectionKey}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section, sectionIndex)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                    >
                      <ProgressCircle
                        percentage={sectionPercentage}
                        isCompleted={
                          sectionLessons.length > 0 &&
                          completedInSection === sectionLessons.length
                        }
                        isActive={sectionLessons.some(
                          (lesson) =>
                            String(lesson?._id || "") ===
                            String(currentLesson?._id || ""),
                        )}
                        size={48}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                          {`Section ${sectionIndex + 1}: ${section?.title || "Untitled"}`}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {completedInSection}/{sectionLessons.length} lessons •{" "}
                          {sectionPercentage}% completed
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {sectionLessons.length}
                        </span>

                        {isOpen ? (
                          <ChevronDown
                            size={20}
                            className="text-slate-500 dark:text-slate-300"
                          />
                        ) : (
                          <ChevronRight
                            size={20}
                            className="text-slate-500 dark:text-slate-300"
                          />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="space-y-2 border-t border-slate-200 p-3 dark:border-white/10">
                        {sectionLessons.map((lesson) => {
                          const lessonId = String(lesson._id);
                          const lessonNumber =
                            allLessons.findIndex(
                              (item) => String(item?._id) === lessonId,
                            ) + 1;
                          const isActive =
                            String(currentLesson?._id) === lessonId;
                          const isCompleted = completedLessonIds.has(lessonId);
                          const lessonHasNote =
                            Boolean(notesByLessonId?.[lessonId]?.trim()) ||
                            (isActive && hasCurrentLessonNote);
                          const lessonProgressPercentage =
                            getLessonProgressPercentage({
                              lesson,
                              lessonProgress,
                              isCompleted,
                            });

                          return (
                            <MobileLessonRow
                              key={lesson._id}
                              lesson={lesson}
                              lessonNumber={lessonNumber || 1}
                              sectionTitle={section.title}
                              isActive={isActive}
                              isCompleted={isCompleted}
                              hasNote={lessonHasNote}
                              progressPercentage={lessonProgressPercentage}
                              onClick={() =>
                                onLessonClick(lesson, section.title)
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Discussion
                  </h2>

                  <button
                    type="button"
                    onClick={() => openPanel("comments")}
                    className="text-sm font-black text-violet-700 dark:text-violet-300"
                  >
                    View all
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                      S
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950 dark:text-white">
                          Sneha Patel
                        </p>

                        <span className="text-xs font-semibold text-slate-500">
                          2h ago
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Great explanation! The examples really helped me
                        understand.
                      </p>

                      <div className="mt-2 flex gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <button type="button">Reply</button>
                        <span>👍 12</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mobilePanel === "comments" && course?._id && currentLesson?._id && (
            <div className="p-3">
              <LessonComments
                courseId={course._id}
                lessonId={currentLesson._id}
              />
            </div>
          )}

          {mobilePanel === "resources" && (
            <div className="p-3">
              <LessonResources courseId={course?._id} lesson={currentLesson} />
            </div>
          )}

          {mobilePanel === "notes" && isStudentLearning && (
            <div className="p-3">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/70">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">
                      Lesson Notes
                    </p>

                    <h3 className="mt-1 break-words text-lg font-black text-slate-950 dark:text-white">
                      {currentLesson?.title || "Current lesson"}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Write, save, download, or delete your personal notes.
                    </p>
                  </div>

                  {noteLoading && (
                    <Loader2
                      size={20}
                      className="shrink-0 animate-spin text-violet-500"
                    />
                  )}
                </div>

                {noteError && (
                  <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    {noteError}
                  </div>
                )}

                {noteMessage && (
                  <div className="mb-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-xs font-bold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
                    {noteMessage}
                  </div>
                )}

                <textarea
                  ref={noteTextareaRef}
                  value={noteContent}
                  onChange={(event) => onNoteContentChange(event.target.value)}
                  rows={9}
                  maxLength={5000}
                  placeholder={`Example:
# Main Heading

💡 Important point
• Write your lesson notes here
❓ Doubt: Revise this topic again`}
                  className="w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/70"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSaveNote}
                    disabled={noteSaving || noteLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {noteSaving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {noteSaving ? "Saving..." : "Save"}
                  </button>

                  {noteContent.trim() && (
                    <button
                      type="button"
                      onClick={onDownloadNote}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      <Download size={15} />
                      Download
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onDeleteNote}
                    disabled={
                      noteDeleting || noteLoading || !noteContent.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                  >
                    {noteDeleting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    {noteDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {noteContent.length}/5000 characters
                </p>
              </section>
            </div>
          )}
        </section>
      </section>
    </main>
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
  const isMobileLearningView = useMediaQuery("(max-width: 1023px)");

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

  const [openDesktopSectionKeys, setOpenDesktopSectionKeys] = useState([]);

  useEffect(() => {
    setOpenDesktopSectionKeys((currentKeys) => {
      if (Array.isArray(currentKeys) && currentKeys.length > 0) {
        return currentKeys;
      }

      return getInitialOpenSectionKeys({
        sections: course?.sections,
        currentLesson,
      });
    });
  }, [course?._id, currentLesson?._id]);

  const toggleDesktopSection = (section, sectionIndex) => {
    const sectionKey = getSectionKey(section, sectionIndex);

    setOpenDesktopSectionKeys((currentKeys) => {
      return toggleSectionKeyInList(currentKeys, sectionKey);
    });
  };

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

    const isLatestRequest = () => activeVideoRequestIdRef.current === requestId;

    const applyVideoAccess = ({
      source,
      playbackType,
      expiresIn = 0,
      debugLabel = "",
    }) => {
      if (!isLatestRequest()) return;

      setVideoSource(source);
      setVideoPlaybackType(playbackType);
      setVideoExpiresIn(Number(expiresIn || 0));

      if (debugLabel) {
        console.log(debugLabel, {
          source,
          playbackType,
          expiresIn,
        });
      }

      if (expiresIn > 0) {
        scheduleSignedVideoRefresh({
          lesson,
          expiresIn,
        });
      }
    };

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

      if (ENABLE_HLS_PLAYBACK) {
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

          const hlsData = hlsRes.data || {};
          const manifestUrl =
            hlsData.manifestUrl ||
            hlsData.videoUrl ||
            hlsData.signedUrl ||
            hlsData.url ||
            "";

          const isRealHls =
            hlsData.success === true &&
            hlsData.playbackMode === "hls" &&
            hlsData.fallback === false &&
            Boolean(manifestUrl);

          if (isRealHls) {
            const hlsExpiresIn = getAccessExpiresInSeconds(hlsData);

            applyVideoAccess({
              source: manifestUrl,
              playbackType: "hls",
              expiresIn: hlsExpiresIn,
              debugLabel: "HLS_SELECTED_FOR_PLAYBACK",
            });

            return;
          }

          const fallbackMp4Url =
            hlsData.videoUrl || hlsData.signedUrl || hlsData.url || "";

          if (fallbackMp4Url) {
            const fallbackExpiresIn = getAccessExpiresInSeconds(hlsData);

            applyVideoAccess({
              source: fallbackMp4Url,
              playbackType: "mp4",
              expiresIn: fallbackExpiresIn,
              debugLabel: "HLS_ROUTE_RETURNED_MP4_FALLBACK",
            });

            return;
          }

          console.warn("HLS_ACCESS_NO_PLAYABLE_URL:", hlsData);
        } catch (hlsError) {
          console.warn(
            "HLS_ACCESS_FAILED_TRYING_MP4:",
            hlsError?.response?.data || hlsError?.message || hlsError,
          );
        }
      }

      const mp4Res = await api.post("/videos/signed-url", {
        courseId: course._id,
        lessonId: lesson._id,
      });

      const mp4Data = mp4Res.data || {};
      const secureVideoUrl =
        mp4Data.videoUrl || mp4Data.signedUrl || mp4Data.url || "";

      if (!secureVideoUrl) {
        throw new Error("Secure video URL not received.");
      }

      const expiresIn = getAccessExpiresInSeconds(mp4Data);

      applyVideoAccess({
        source: secureVideoUrl,
        playbackType: mp4Data.playbackType || "mp4",
        expiresIn,
        debugLabel: "MP4_SELECTED_FOR_PLAYBACK",
      });

      if (isSilentRefresh && import.meta.env.DEV) {
        console.info("Secure lesson video URL refreshed.", {
          lessonId: lesson._id,
          expiresIn,
        });
      }
    } catch (error) {
      if (!isLatestRequest()) return;

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
      if (isLatestRequest() && !isSilentRefresh) {
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

  if (isMobileLearningView) {
    return (
      <MobileLearningView
        course={course}
        currentLesson={currentLesson}
        lessons={lessons}
        completedLessonIds={completedLessonIds}
        lessonProgress={progress.lessonProgress}
        safeProgress={safeProgress}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        videoSource={videoSource}
        videoPlaybackType={videoPlaybackType}
        videoStartTime={videoStartTime}
        videoLoading={videoLoading}
        videoError={videoError}
        videoExpiresIn={videoExpiresIn}
        currentLessonCompleted={currentLessonCompleted}
        updatingCompletion={updatingCompletion}
        lessonCompleteMessage={lessonCompleteMessage}
        lessonCompleteError={lessonCompleteError}
        certificateError={certificateError}
        isStudentLearning={isStudentLearning}
        isAdminLearning={isAdminLearning}
        currentLessonResourceCount={currentLessonResourceCount}
        notesByLessonId={notesByLessonId}
        hasCurrentLessonNote={hasCurrentLessonNote}
        noteTextareaRef={noteTextareaRef}
        noteContent={noteContent}
        noteLoading={noteLoading}
        noteSaving={noteSaving}
        noteDeleting={noteDeleting}
        noteMessage={noteMessage}
        noteError={noteError}
        onNoteContentChange={(value) => {
          setNoteContent(value);
          setNoteMessage("");
          setNoteError("");
        }}
        onSaveNote={handleSaveNote}
        onDownloadNote={handleDownloadNote}
        onDeleteNote={handleDeleteNote}
        onLessonClick={handleLessonClick}
        onToggleLessonComplete={handleToggleLessonComplete}
        onSaveWatchPosition={saveLessonWatchPosition}
        onVideoEnded={() => {
          if (isStudentLearning && !currentLessonCompleted) {
            handleToggleLessonComplete();
          }
        }}
        onVideoError={(message) => {
          console.error("VIDEO_PLAYER_ERROR:", message);
        }}
      />
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

          <aside className="self-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:sticky lg:top-24 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
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

            <CourseProgressCompact safeProgress={safeProgress} />

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

            <div className="max-h-[calc(100vh-17rem)] overflow-y-auto">
              {course?.sections?.map((section, sectionIndex) => {
                const sectionKey = getSectionKey(section, sectionIndex);
                const sectionLessons = Array.isArray(section?.lessons)
                  ? section.lessons
                  : [];
                const isOpen = openDesktopSectionKeys.includes(sectionKey);
                const completedInSection = sectionLessons.filter((lesson) =>
                  completedLessonIds.has(String(lesson?._id || "")),
                ).length;
                const sectionPercentage = getSectionProgressPercentage({
                  section,
                  lessonProgress: progress.lessonProgress,
                  completedLessonIds,
                });
                const sectionHasCurrentLesson = sectionLessons.some(
                  (lesson) =>
                    String(lesson?._id || "") ===
                    String(currentLesson?._id || ""),
                );

                return (
                  <div
                    key={sectionKey}
                    className="border-b border-slate-200 dark:border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleDesktopSection(section, sectionIndex)
                      }
                      className="flex w-full items-center gap-4 bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-white/[0.04]"
                    >
                      <ProgressCircle
                        percentage={sectionPercentage}
                        isCompleted={
                          sectionLessons.length > 0 &&
                          completedInSection === sectionLessons.length
                        }
                        isActive={sectionHasCurrentLesson}
                        size={52}
                      />

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-lg font-black text-slate-950 dark:text-white">
                          {`Section ${sectionIndex + 1}: ${section?.title || "Untitled"}`}
                        </h4>

                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {completedInSection}/{sectionLessons.length} lessons •{" "}
                          {sectionPercentage}% completed
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                          {sectionLessons.length}
                        </span>

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
                      <div className="space-y-3 p-4">
                        {sectionLessons.map((lesson) => {
                          const lessonId = String(lesson._id);
                          const isActive =
                            String(currentLesson?._id) === lessonId;
                          const isCompleted = completedLessonIds.has(lessonId);
                          const lessonHasNote =
                            Boolean(notesByLessonId[lessonId]?.trim()) ||
                            (isActive && hasCurrentLessonNote);
                          const lessonProgressPercentage =
                            getLessonProgressPercentage({
                              lesson,
                              lessonProgress: progress.lessonProgress,
                              isCompleted: isStudentLearning && isCompleted,
                            });

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

                                  {isStudentLearning && (
                                    <div className="mt-3 flex items-center gap-3">
                                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            isCompleted
                                              ? "bg-green-500"
                                              : isActive
                                                ? "bg-blue-500"
                                                : "bg-violet-500"
                                          }`}
                                          style={{
                                            width: `${clampPercentage(
                                              lessonProgressPercentage,
                                            )}%`,
                                          }}
                                        />
                                      </div>

                                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                                        {clampPercentage(
                                          lessonProgressPercentage,
                                        )}
                                        %
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {isStudentLearning && (
                                  <ProgressCircle
                                    percentage={lessonProgressPercentage}
                                    isCompleted={isCompleted}
                                    isActive={isActive}
                                    size={54}
                                  />
                                )}

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
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default LearningPage;
