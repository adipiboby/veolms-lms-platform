import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  FileVideo,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { api } from "../../services/api";

const PART_SIZE = 10 * 1024 * 1024;
const STORAGE_PREFIX = "veolms-video-upload:";

const normalizeETag = (etag = "") => {
  const clean = String(etag || "").trim();

  return clean.startsWith('"') ? clean : `"${clean}"`;
};

const getSessionStorageKey = (file) => {
  return `${STORAGE_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
};

const getAnySavedUploadExists = () => {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (key?.startsWith(STORAGE_PREFIX)) return true;
    }

    return false;
  } catch {
    return false;
  }
};

const loadSavedSessionForFile = (file) => {
  try {
    const storageKey = getSessionStorageKey(file);
    const saved = localStorage.getItem(storageKey);

    if (!saved) return null;

    return JSON.parse(saved);
  } catch {
    return null;
  }
};

const saveSession = (storageKey, session) => {
  localStorage.setItem(storageKey, JSON.stringify(session));
};

const clearSession = (storageKey) => {
  if (!storageKey) return;

  localStorage.removeItem(storageKey);
};

const clearAllSavedUploadSessions = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};

const getApiErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Video upload failed."
  );
};

const isOldUploadOwnershipError = (error) => {
  const status = Number(error?.response?.status || 0);
  const message = getApiErrorMessage(error).toLowerCase();

  return (
    status === 403 &&
    (message.includes("own video") ||
      message.includes("upload parts only for your own video") ||
      message.includes("you can upload parts only for your own video"))
  );
};

const formatVideoDuration = (seconds) => {
  const totalSeconds = Math.floor(Number(seconds) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getTitleFromFileName = (fileName = "") => {
  return String(fileName || "Lesson Video")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
};

const getVideoDurationFromFile = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;

      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      resolve(0);
    };

    video.src = objectUrl;
  });
};

const getVideoMetadataFromFile = async (file) => {
  const durationSeconds = await getVideoDurationFromFile(file);
  const title = getTitleFromFileName(file.name);

  return {
    title,
    displayTitle: title,
    duration: formatVideoDuration(durationSeconds),
    durationSeconds: Math.floor(durationSeconds || 0),
    originalVideoName: file.name,
    fileName: file.name,
    mimeType: file.type || "video/mp4",
    sizeBytes: file.size,
    sizeMB: Number((file.size / 1024 / 1024).toFixed(2)),
  };
};

const uploadPartWithProgress = ({ uploadUrl, chunk, onProgress, xhrRef }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhrRef.current = xhr;

    xhr.open("PUT", uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");

        if (!etag) {
          reject(new Error("ETag missing from S3 response."));
          return;
        }

        resolve(normalizeETag(etag));
        return;
      }

      reject(new Error(`S3 upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading to S3."));
    };

    xhr.onabort = () => {
      reject(new Error("UPLOAD_PAUSED"));
    };

    xhr.send(chunk);
  });
};

const StatusBox = ({ type = "info", children }) => {
  const className =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : type === "warning"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
        : type === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-blue-500/30 bg-blue-500/10 text-blue-200";

  return (
    <div className={`rounded-xl border p-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  );
};

const UploadBusyPanel = ({
  uploadStage,
  selectedMetadata,
  progress,
  message,
  warning,
  paused,
  onPause,
  onResume,
  onCancel,
}) => {
  const isReading = uploadStage === "reading";
  const isCreating = uploadStage === "creating";
  const isUploading = uploadStage === "uploading";
  const isFinalizing = uploadStage === "finalizing";
  const isProcessing = uploadStage === "processing";

  const title = isReading
    ? "Reading video details..."
    : isCreating
      ? "Creating course and lesson id..."
      : isUploading
        ? "Uploading video..."
        : isFinalizing
          ? "Finalizing uploaded video..."
          : isProcessing
            ? "Processing video qualities..."
            : paused
              ? "Upload paused"
              : "Preparing video upload...";

  const displayProgress =
    isReading || isCreating ? 5 : isFinalizing ? 100 : progress;

  return (
    <div className="rounded-xl border border-dashed border-blue-500/40 bg-blue-500/10 p-5">
      <div className="flex flex-col items-center text-center">
        {paused ? (
          <Pause className="mb-3 text-yellow-200" size={38} />
        ) : isProcessing ? (
          <RefreshCw className="mb-3 animate-spin text-blue-200" size={38} />
        ) : (
          <Loader2 className="mb-3 animate-spin text-blue-200" size={38} />
        )}

        <p className="text-base font-black text-white">{title}</p>

        <p className="mt-2 max-w-xl text-sm text-slate-300">
          Please wait. Do not refresh this page and do not choose the same video
          again.
        </p>
      </div>

      {selectedMetadata && (
        <div className="mt-4 rounded-xl border border-blue-400/20 bg-slate-950/60 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-blue-100">
            <FileVideo size={16} />
            {selectedMetadata.title}
          </p>

          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <p>Duration: {selectedMetadata.duration || "0:00"}</p>
            <p>File: {selectedMetadata.originalVideoName}</p>
            <p>Size: {selectedMetadata.sizeMB} MB</p>
            <p>Type: {selectedMetadata.mimeType}</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-blue-100">
          <span>{paused ? "Paused" : "Progress"}</span>
          <span>
            {Math.max(0, Math.min(100, Number(displayProgress || 0)))}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, Number(displayProgress || 0)))}%`,
            }}
          />
        </div>
      </div>

      {message && (
        <div className="mt-3">
          <StatusBox type="success">{message}</StatusBox>
        </div>
      )}

      {warning && (
        <div className="mt-3">
          <StatusBox type="warning">{warning}</StatusBox>
        </div>
      )}

      {isUploading && !paused && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onPause}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Pause Upload
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
          >
            Cancel Upload
          </button>
        </div>
      )}

      {paused && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Play size={15} />
            Resume Upload
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
          >
            Cancel Upload
          </button>
        </div>
      )}
    </div>
  );
};

const VideoUploadField = ({
  value,
  onChange,
  onMetaChange,
  onUploadSuccess,
  resolveUploadContext,
  courseSlug,
  courseId,
  lessonId,
  disabled = false,
}) => {
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);
  const pausedRef = useRef(false);
  const sessionRef = useRef(null);
  const storageKeyRef = useRef("");
  const resumeModeRef = useRef(false);
  const processingPollTimerRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [hasSavedUpload, setHasSavedUpload] = useState(false);

  const [uploadStage, setUploadStage] = useState("idle");
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const [processingStatus, setProcessingStatus] = useState("");
  const [processingMessage, setProcessingMessage] = useState("");

  const hasRequiredLessonTarget = Boolean(courseId && lessonId);
  const canResolveUploadContext = typeof resolveUploadContext === "function";
  const isBusy =
    uploadStage === "reading" ||
    uploadStage === "creating" ||
    uploadStage === "uploading" ||
    uploadStage === "finalizing" ||
    uploadStage === "processing";
  const uploadDisabled = disabled || isBusy;
  const showBusyPanel = isBusy || paused;

  const missingTargetMessage =
    "Course and lesson id are missing. Choose a video again so the app can create them automatically before upload.";

  useEffect(() => {
    setHasSavedUpload(getAnySavedUploadExists());

    return () => {
      if (processingPollTimerRef.current) {
        clearTimeout(processingPollTimerRef.current);
      }
    };
  }, []);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetUploadState = () => {
    pausedRef.current = false;
    resumeModeRef.current = false;
    sessionRef.current = null;
    storageKeyRef.current = "";

    setSelectedFile(null);
    setSelectedMetadata(null);
    setUploadStage("idle");
    setPaused(false);
    setProgress(0);

    xhrRef.current = null;
    resetInput();
  };

  const openFilePicker = () => {
    if (disabled || isBusy) return;

    if (!hasRequiredLessonTarget && !canResolveUploadContext) {
      setError(missingTargetMessage);
      setMessage("");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleClearOldUploads = () => {
    if (isBusy) return;

    clearAllSavedUploadSessions();
    resetUploadState();

    setHasSavedUpload(false);
    setError("");
    setWarning("");
    setMessage("Old upload sessions cleared. Choose video again.");
  };

  const handleRemoveVideo = () => {
    if (isBusy) return;

    onChange?.("");

    onMetaChange?.({
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
    });

    resetUploadState();

    setProcessingStatus("");
    setProcessingMessage("");
    setMessage("Video removed from this lesson.");
    setWarning("");
    setError("");
  };

  const handleOldSessionOwnershipError = () => {
    clearAllSavedUploadSessions();
    resetUploadState();

    setHasSavedUpload(false);
    setMessage("");
    setWarning("");
    setError(
      "Old upload session was removed because it belongs to another admin or old login. Please click Choose Video and upload again fresh.",
    );
  };

  const getActiveUploadTarget = async ({ file, metadata, session }) => {
    if (session?.courseId && session?.lessonId) {
      return {
        activeCourseSlug: session.courseSlug || courseSlug || "course",
        activeCourseId: session.courseId,
        activeLessonId: session.lessonId,
      };
    }

    if (courseId && lessonId) {
      return {
        activeCourseSlug: courseSlug || "course",
        activeCourseId: courseId,
        activeLessonId: lessonId,
      };
    }

    if (!canResolveUploadContext) {
      throw new Error(missingTargetMessage);
    }

    setUploadStage("creating");
    setProgress(5);
    setMessage("Creating course and lesson id...");
    setWarning("Please wait. Do not select the same video again.");

    const context = await resolveUploadContext({
      file,
      metadata,
    });

    const activeCourseId = context?.courseId;
    const activeLessonId = context?.lessonId;
    const activeCourseSlug = context?.courseSlug || courseSlug || "course";

    if (!activeCourseId || !activeLessonId) {
      throw new Error(
        "Unable to create a lesson id automatically. Please check required course and lesson fields, then try again.",
      );
    }

    return {
      activeCourseSlug,
      activeCourseId,
      activeLessonId,
    };
  };

  const pollProcessingStatus = async ({ videoId, jobId, attempt = 1 }) => {
    if (!videoId && !jobId) return;

    try {
      if (!videoId) {
        setUploadStage("idle");
        setProcessingStatus("processing");
        setProcessingMessage(
          "Upload completed. Video processing is running in background. Refresh after some time to see ready status.",
        );
        return;
      }

      const response = await api.get(`/videos/admin/job-status/${videoId}`);
      const video = response.data.video || response.data.data || response.data;

      const hlsStatus =
        video?.hlsStatus || video?.status || video?.mediaConvertJobStatus || "";

      if (
        hlsStatus === "ready" ||
        hlsStatus === "COMPLETE" ||
        video?.mediaConvertJobStatus === "COMPLETE"
      ) {
        setUploadStage("idle");
        setProcessingStatus("ready");
        setProcessingMessage(
          "Video processing completed. 720p / 480p / 360p is ready.",
        );
        setWarning("");
        return;
      }

      if (
        hlsStatus === "failed" ||
        hlsStatus === "ERROR" ||
        video?.mediaConvertJobStatus === "ERROR"
      ) {
        setUploadStage("idle");
        setProcessingStatus("failed");
        setProcessingMessage(
          video?.processingError ||
            video?.mediaConvertError ||
            "Video processing failed. Please check MediaConvert logs.",
        );
        setWarning("");
        return;
      }

      setUploadStage("processing");
      setProcessingStatus("processing");
      setProcessingMessage(
        "Upload completed. Please wait while 720p / 480p / 360p video quality conversion finishes.",
      );

      if (attempt >= 60) {
        setUploadStage("idle");
        setProcessingMessage(
          "Upload completed. Video processing is still running in background. You can refresh later.",
        );
        return;
      }

      processingPollTimerRef.current = setTimeout(() => {
        pollProcessingStatus({
          videoId,
          jobId,
          attempt: attempt + 1,
        });
      }, 5000);
    } catch (pollError) {
      console.warn("VIDEO_PROCESSING_STATUS_POLL_WARNING:", pollError);

      setUploadStage("idle");
      setProcessingStatus("processing");
      setProcessingMessage(
        "Upload completed. Video processing is running in background. Refresh after some time to see ready status.",
      );
    }
  };

  const startOrResumeUpload = async (
    file,
    metadataFromSelect = null,
    options = {},
  ) => {
    const shouldResume = Boolean(options.resume);
    const storageKey = getSessionStorageKey(file);

    storageKeyRef.current = storageKey;

    try {
      setSelectedFile(file);
      setPaused(false);
      setError("");
      setWarning("");
      setProgress(0);
      setProcessingStatus("");
      setProcessingMessage("");
      pausedRef.current = false;

      const metadata =
        metadataFromSelect ||
        selectedMetadata ||
        (await getVideoMetadataFromFile(file));

      setSelectedMetadata(metadata);
      onMetaChange?.(metadata);

      let session = shouldResume ? loadSavedSessionForFile(file) : null;

      if (!shouldResume) {
        clearSession(storageKey);
        session = null;
      }

      const { activeCourseSlug, activeCourseId, activeLessonId } =
        await getActiveUploadTarget({
          file,
          metadata,
          session,
        });

      if (session?.uploadId && session?.key) {
        setUploadStage("uploading");
        setMessage("Resuming previous upload...");
      } else {
        setUploadStage("uploading");
        setMessage("Starting video upload...");
        setWarning(
          "Please wait. Video upload is in progress. Do not close this page or upload same video again.",
        );

        const initiateRes = await api.post("/videos/admin/multipart/initiate", {
          fileName: file.name,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          courseSlug: activeCourseSlug,
          courseId: activeCourseId,
          lessonId: activeLessonId,
        });

        session = {
          uploadId: initiateRes.data.uploadId,
          key: initiateRes.data.key,
          fileName: file.name,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          lastModified: file.lastModified,
          courseSlug: activeCourseSlug,
          courseId: activeCourseId,
          lessonId: activeLessonId,
          completedParts: [],
        };

        saveSession(storageKey, session);
      }

      sessionRef.current = session;
      setHasSavedUpload(getAnySavedUploadExists());

      const totalParts = Math.ceil(file.size / PART_SIZE);

      let completedParts = Array.isArray(session.completedParts)
        ? session.completedParts
        : [];

      let uploadedBytes = completedParts.reduce((total, part) => {
        const partIndex = Number(part.PartNumber) - 1;
        const start = partIndex * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);

        return total + Math.max(end - start, 0);
      }, 0);

      setProgress(Math.round((uploadedBytes / file.size) * 100));

      for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        if (pausedRef.current) {
          throw new Error("UPLOAD_PAUSED");
        }

        const alreadyUploaded = completedParts.some(
          (part) => Number(part.PartNumber) === partNumber,
        );

        if (alreadyUploaded) {
          continue;
        }

        setUploadStage("uploading");
        setMessage(`Uploading part ${partNumber} of ${totalParts}...`);
        setWarning(
          "Upload is running. Please do not refresh or choose the video again.",
        );

        const start = (partNumber - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partUrlRes = await api.post(
          "/videos/admin/multipart/presign-part",
          {
            key: session.key,
            uploadId: session.uploadId,
            partNumber,
          },
        );

        let currentPartLoaded = 0;

        const etag = await uploadPartWithProgress({
          uploadUrl: partUrlRes.data.uploadUrl,
          chunk,
          xhrRef,
          onProgress: (loaded) => {
            currentPartLoaded = loaded;

            const currentTotal = uploadedBytes + currentPartLoaded;
            const percent = Math.min(
              99,
              Math.round((currentTotal / file.size) * 100),
            );

            setProgress(percent);
          },
        });

        uploadedBytes += chunk.size;

        completedParts = [
          ...completedParts,
          {
            PartNumber: partNumber,
            ETag: etag,
          },
        ].sort((a, b) => Number(a.PartNumber) - Number(b.PartNumber));

        session = {
          ...session,
          completedParts,
        };

        sessionRef.current = session;
        saveSession(storageKey, session);

        setProgress(Math.round((uploadedBytes / file.size) * 100));
      }

      setUploadStage("finalizing");
      setProgress(100);
      setMessage("Finalizing uploaded video...");
      setWarning(
        "Upload completed. Now starting video processing. Please wait.",
      );

      const completeRes = await api.post("/videos/admin/multipart/complete", {
        key: session.key,
        uploadId: session.uploadId,
        parts: completedParts,

        originalName: file.name,
        mimeType: file.type || "video/mp4",
        sizeBytes: file.size,

        courseSlug: session.courseSlug || activeCourseSlug,
        courseId: session.courseId || activeCourseId,
        lessonId: session.lessonId || activeLessonId,

        displayTitle: metadata.title,
        duration: metadata.duration,
        durationSeconds: metadata.durationSeconds,
      });

      const video = completeRes.data.video;
      const finalVideoKey = video?.key || session.key;

      const finalMetadata = {
        ...metadata,
        videoUrl: finalVideoKey,
        videoKey: finalVideoKey,
        videoAssetId: video?._id || null,
        hlsManifestKey: video?.hlsManifestKey || "",
        hlsOutputPrefix: video?.hlsOutputPrefix || "",
      };

      onChange?.(finalVideoKey);
      onMetaChange?.(finalMetadata);
      onUploadSuccess?.(video, finalMetadata);

      clearSession(storageKey);

      sessionRef.current = null;
      storageKeyRef.current = "";

      setHasSavedUpload(getAnySavedUploadExists());
      setProgress(100);
      setMessage("Video uploaded successfully.");
      setWarning(
        "Please wait. HLS quality conversion is processing in the background. Do not upload the same video again.",
      );
      setPaused(false);
      setError("");
      setUploadStage("processing");
      setProcessingStatus("processing");
      setProcessingMessage(
        "MediaConvert is creating 720p / 480p / 360p video qualities...",
      );

      const videoId = video?._id || finalMetadata.videoAssetId || "";
      const jobId =
        video?.mediaConvertJobId || completeRes.data.mediaConvertJobId || "";

      if (videoId || jobId) {
        pollProcessingStatus({
          videoId,
          jobId,
        });
      }
    } catch (error) {
      if (error.message === "UPLOAD_PAUSED") {
        setUploadStage("idle");
        setPaused(true);
        setMessage("Upload paused. Click Resume Upload to continue.");
        setWarning("");
        setError("");
        return;
      }

      console.error("VIDEO_UPLOAD_ERROR:", error);

      if (isOldUploadOwnershipError(error)) {
        handleOldSessionOwnershipError();
        return;
      }

      const errorMessage = getApiErrorMessage(error);

      setUploadStage("idle");
      setPaused(false);
      setError(errorMessage);
      setMessage("");
      setWarning("");
    } finally {
      xhrRef.current = null;
      resumeModeRef.current = false;
      resetInput();
      setHasSavedUpload(getAnySavedUploadExists());
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setWarning(
        "Please wait. Reading details first, then upload will start automatically.",
      );
      setMessage("Reading video details...");
      setProgress(3);
      setUploadStage("reading");

      const metadata = await getVideoMetadataFromFile(file);

      setSelectedFile(file);
      setSelectedMetadata(metadata);

      onMetaChange?.(metadata);

      const shouldResume = resumeModeRef.current;
      resumeModeRef.current = false;

      await startOrResumeUpload(file, metadata, {
        resume: shouldResume,
      });
    } catch (error) {
      console.error("VIDEO_METADATA_ERROR:", error);

      setUploadStage("idle");
      setPaused(false);
      setError(error.message || "Unable to read video details.");
      setMessage("");
      setWarning("");
      resumeModeRef.current = false;
      resetInput();
    }
  };

  const handlePauseUpload = () => {
    if (uploadStage !== "uploading") return;

    pausedRef.current = true;
    xhrRef.current?.abort();
  };

  const handleResumeUpload = async () => {
    if (selectedFile) {
      await startOrResumeUpload(selectedFile, selectedMetadata, {
        resume: true,
      });

      return;
    }

    resumeModeRef.current = true;
    openFilePicker();
  };

  const handleCancelUpload = async () => {
    try {
      pausedRef.current = true;
      xhrRef.current?.abort();

      const session = sessionRef.current;

      if (session?.key && session?.uploadId) {
        await api.post("/videos/admin/multipart/abort", {
          key: session.key,
          uploadId: session.uploadId,
        });
      }

      if (storageKeyRef.current) {
        clearSession(storageKeyRef.current);
      }

      resetUploadState();

      setMessage("Upload cancelled.");
      setWarning("");
      setError("");
      setHasSavedUpload(getAnySavedUploadExists());
    } catch (error) {
      if (isOldUploadOwnershipError(error)) {
        handleOldSessionOwnershipError();
        return;
      }

      setError(getApiErrorMessage(error));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        className="hidden"
        onChange={handleFileChange}
      />

      {!hasRequiredLessonTarget && !canResolveUploadContext && (
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm font-semibold text-yellow-200">
          {missingTargetMessage}
        </div>
      )}

      {showBusyPanel ? (
        <UploadBusyPanel
          uploadStage={uploadStage}
          selectedMetadata={selectedMetadata}
          progress={progress}
          message={message}
          warning={warning}
          paused={paused}
          onPause={handlePauseUpload}
          onResume={handleResumeUpload}
          onCancel={handleCancelUpload}
        />
      ) : value ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <CheckCircle size={16} />
            Video selected
          </p>

          <p className="break-all rounded-xl bg-slate-900 p-3 text-xs text-slate-400">
            {value}
          </p>

          {selectedMetadata && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-blue-200">
                <FileVideo size={16} />
                {selectedMetadata.title}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Duration: {selectedMetadata.duration} • Size:{" "}
                {selectedMetadata.sizeMB} MB
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploadDisabled}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace Video
            </button>

            <button
              type="button"
              onClick={handleRemoveVideo}
              disabled={uploadDisabled}
              className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove Video
            </button>

            {hasSavedUpload && (
              <button
                type="button"
                onClick={handleClearOldUploads}
                disabled={uploadDisabled}
                className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Old Uploads
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/70 p-6 text-center">
          <UploadCloud className="mx-auto mb-3 text-slate-400" size={38} />

          <p className="font-semibold text-slate-200">
            Video is not available.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Select a video. The app reads details, creates the lesson id if
            needed, then uploads the same file.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploadDisabled}
              className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Choose Video
            </button>

            <button
              type="button"
              onClick={handleResumeUpload}
              disabled={uploadDisabled}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Resume Upload
            </button>

            {hasSavedUpload && (
              <button
                type="button"
                onClick={handleClearOldUploads}
                disabled={uploadDisabled}
                className="rounded-xl border border-yellow-500/50 px-5 py-2.5 font-semibold text-yellow-200 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Old Uploads
              </button>
            )}
          </div>
        </div>
      )}

      {processingMessage && !showBusyPanel && (
        <div className="mt-3">
          <StatusBox
            type={
              processingStatus === "ready"
                ? "success"
                : processingStatus === "failed"
                  ? "error"
                  : "info"
            }
          >
            <div className="flex items-start gap-2">
              {processingStatus === "ready" ? (
                <CheckCircle size={17} className="mt-0.5 shrink-0" />
              ) : processingStatus === "failed" ? (
                <XCircle size={17} className="mt-0.5 shrink-0" />
              ) : (
                <RefreshCw size={17} className="mt-0.5 shrink-0 animate-spin" />
              )}

              <span>{processingMessage}</span>
            </div>
          </StatusBox>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <StatusBox type="error">{error}</StatusBox>
        </div>
      )}

      {message && !showBusyPanel && (
        <div className="mt-3">
          <StatusBox type="success">{message}</StatusBox>
        </div>
      )}

      {warning && !showBusyPanel && (
        <div className="mt-3">
          <StatusBox type="warning">{warning}</StatusBox>
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Choose Video is one user action. Reading video details happens locally
          before uploading; it is not a second upload.
        </span>
      </div>
    </div>
  );
};

export default VideoUploadField;
