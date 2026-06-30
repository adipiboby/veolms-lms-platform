import { useEffect, useRef, useState } from "react";
import { CheckCircle, FileVideo, Info } from "lucide-react";

import { api } from "../../services/api";

const PART_SIZE = 10 * 1024 * 1024; // 10 MB
const STORAGE_PREFIX = "veolms-video-upload:";

const normalizeETag = (etag = "") => {
  const clean = String(etag).trim();

  return clean.startsWith('"') ? clean : `"${clean}"`;
};

const getSessionStorageKey = (file) => {
  return `${STORAGE_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
};

const getAnySavedUploadExists = () => {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);

    if (key?.startsWith(STORAGE_PREFIX)) return true;
  }

  return false;
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
  localStorage.removeItem(storageKey);
};

const clearAllSavedUploadSessions = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};

const getApiErrorMessage = (err) => {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    "Video upload failed."
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
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
};

const getVideoDurationFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);

      if (!Number.isFinite(video.duration)) {
        resolve(0);
        return;
      }

      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read video duration."));
    };

    video.src = objectUrl;
  });
};

const getVideoMetadataFromFile = async (file) => {
  const durationSeconds = await getVideoDurationFromFile(file);

  return {
    title: getTitleFromFileName(file.name),
    duration: formatVideoDuration(durationSeconds),
    durationSeconds: Math.floor(durationSeconds || 0),
    originalVideoName: file.name,
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

const VideoUploadField = ({
  value,
  onChange,
  onMetaChange,
  onUploadSuccess,
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [hasSavedUpload, setHasSavedUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setHasSavedUpload(getAnySavedUploadExists());
  }, []);

  const openFilePicker = () => {
    if (disabled || uploading) return;

    fileInputRef.current?.click();
  };

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearOldUploads = () => {
    if (uploading) return;

    clearAllSavedUploadSessions();

    setHasSavedUpload(false);
    setSelectedFile(null);
    setSelectedMetadata(null);
    setProgress(0);
    setPaused(false);
    setError("");
    setMessage("Old upload sessions cleared. Choose video again.");
    resetInput();
  };

  const handleRemoveVideo = () => {
    if (uploading) return;

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

    setSelectedFile(null);
    setSelectedMetadata(null);
    setProgress(0);
    setPaused(false);
    setMessage("Video removed from this lesson.");
    setError("");
    resetInput();
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
      setUploading(true);
      setPaused(false);
      setError("");
      setProgress(0);
      pausedRef.current = false;

      const metadata =
        metadataFromSelect ||
        selectedMetadata ||
        (await getVideoMetadataFromFile(file));

      setSelectedMetadata(metadata);

      // Auto-fill lesson title and duration before upload completes.
      onMetaChange?.(metadata);

      let session = shouldResume ? loadSavedSessionForFile(file) : null;

      // Important:
      // Choose Video = fresh upload.
      // Resume Upload = use saved multipart session.
      if (!shouldResume) {
        clearSession(storageKey);
      }

      if (session?.uploadId && session?.key) {
        setMessage("Resuming previous upload...");
      } else {
        setMessage("Starting fresh upload...");

        const initiateRes = await api.post("/videos/admin/multipart/initiate", {
          fileName: file.name,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          courseSlug,
          courseId,
          lessonId,
        });

        session = {
          uploadId: initiateRes.data.uploadId,
          key: initiateRes.data.key,
          fileName: file.name,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          lastModified: file.lastModified,
          completedParts: [],
        };

        saveSession(storageKey, session);
      }

      sessionRef.current = session;

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

        setMessage(`Uploading part ${partNumber} of ${totalParts}...`);

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

      setMessage("Completing upload...");

      const completeRes = await api.post("/videos/admin/multipart/complete", {
        key: session.key,
        uploadId: session.uploadId,
        parts: completedParts,

        originalName: file.name,
        mimeType: file.type || "video/mp4",
        sizeBytes: file.size,

        courseSlug,
        courseId,
        lessonId,

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
      setHasSavedUpload(getAnySavedUploadExists());

      setProgress(100);
      setMessage("Video uploaded successfully. HLS processing started.");
      setPaused(false);
      setError("");
    } catch (err) {
      if (err.message === "UPLOAD_PAUSED") {
        setPaused(true);
        setMessage("Upload paused. Click Resume Upload to continue.");
        setError("");
        return;
      }

      console.error("VIDEO_UPLOAD_ERROR:", err);

      const errorMessage = getApiErrorMessage(err);
      const lowerMessage = errorMessage.toLowerCase();

      const isOwnershipError =
        lowerMessage.includes("only for your own video") ||
        lowerMessage.includes("forbidden") ||
        err.response?.status === 403;

      if (isOwnershipError) {
        if (storageKeyRef.current) {
          clearSession(storageKeyRef.current);
        }

        setHasSavedUpload(getAnySavedUploadExists());
        setSelectedFile(null);
        setSelectedMetadata(null);
        setProgress(0);
        setPaused(false);
        setMessage("");

        setError(
          "Old upload session removed. Click Choose Video and upload again fresh.",
        );

        return;
      }

      setError(errorMessage);
      setMessage("");
    } finally {
      setUploading(false);
      xhrRef.current = null;
      resumeModeRef.current = false;
      resetInput();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setMessage("Reading video details...");

      const metadata = await getVideoMetadataFromFile(file);

      setSelectedFile(file);
      setSelectedMetadata(metadata);

      // Auto-fill immediately before upload.
      onMetaChange?.(metadata);

      const shouldResume = resumeModeRef.current;
      resumeModeRef.current = false;

      await startOrResumeUpload(file, metadata, {
        resume: shouldResume,
      });
    } catch (err) {
      console.error("VIDEO_METADATA_ERROR:", err);

      setError(err.message || "Unable to read video details.");
      setMessage("");
      resumeModeRef.current = false;
      resetInput();
    }
  };

  const handlePauseUpload = () => {
    if (!uploading) return;

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

      setSelectedFile(null);
      setSelectedMetadata(null);
      setUploading(false);
      setPaused(false);
      setProgress(0);
      setMessage("Upload cancelled.");
      setError("");
      setHasSavedUpload(getAnySavedUploadExists());
      resetInput();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to cancel upload.",
      );
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

      {value ? (
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
              disabled={disabled || uploading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace Video
            </button>

            <button
              type="button"
              onClick={handleRemoveVideo}
              disabled={disabled || uploading}
              className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove Video
            </button>

            {hasSavedUpload && (
              <button
                type="button"
                onClick={handleClearOldUploads}
                disabled={disabled || uploading}
                className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Old Uploads
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/70 px-4 py-8 text-center">
          <p className="text-sm text-slate-300">Video is not available.</p>

          <p className="max-w-md text-xs text-slate-500">
            Select a video. Lesson title and duration will auto-fill from the
            video file before upload.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={disabled || uploading}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Choose Video"}
            </button>

            {(paused || hasSavedUpload) && (
              <button
                type="button"
                onClick={handleResumeUpload}
                disabled={disabled || uploading}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resume Upload
              </button>
            )}

            {hasSavedUpload && (
              <button
                type="button"
                onClick={handleClearOldUploads}
                disabled={disabled || uploading}
                className="rounded-xl border border-yellow-500/40 px-5 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Old Uploads
              </button>
            )}
          </div>

          {hasSavedUpload && !selectedFile && (
            <p className="text-xs text-yellow-300">
              Old upload session found. Use Resume only for the same video, or
              Clear Old Uploads.
            </p>
          )}
        </div>
      )}

      {selectedMetadata && !value && (
        <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-blue-200">
            <Info size={15} />
            Auto-filled from video
          </p>

          <p className="mt-1 text-sm text-slate-300">
            {selectedMetadata.title}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Duration: {selectedMetadata.duration} • Size:{" "}
            {selectedMetadata.sizeMB} MB
          </p>
        </div>
      )}

      {(uploading || paused || progress > 0) && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{message}</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {uploading && (
              <button
                type="button"
                onClick={handlePauseUpload}
                className="rounded-xl border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10"
              >
                Pause Upload
              </button>
            )}

            {paused && (
              <button
                type="button"
                onClick={handleResumeUpload}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Resume Upload
              </button>
            )}

            {(uploading || paused) && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
              >
                Cancel Upload
              </button>
            )}
          </div>
        </div>
      )}

      {!uploading && !paused && message && (
        <p className="mt-3 text-sm text-emerald-300">{message}</p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
};

export default VideoUploadField;
