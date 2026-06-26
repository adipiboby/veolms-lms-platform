import { useEffect, useRef, useState } from "react";
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
          reject(new Error("ETag missing from S3 response"));
          return;
        }

        resolve(normalizeETag(etag));
        return;
      }

      reject(new Error(`S3 upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading to S3"));
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

  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleRemoveVideo = () => {
    if (uploading) return;

    if (onChange) {
      onChange("");
    }

    setMessage("Video removed from this lesson.");
    setError("");
  };

  const startOrResumeUpload = async (file) => {
    const storageKey = getSessionStorageKey(file);
    storageKeyRef.current = storageKey;

    try {
      setSelectedFile(file);
      setUploading(true);
      setPaused(false);
      setError("");
      setProgress(0);
      pausedRef.current = false;

      let session = loadSavedSessionForFile(file);

      if (session?.uploadId && session?.key) {
        setMessage("Resuming previous upload...");
      } else {
        setMessage("Starting upload...");

        const initiateRes = await api.post("/videos/admin/multipart/initiate", {
          fileName: file.name,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          courseSlug,
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
      });

      const video = completeRes.data.video;
      const finalVideoKey = video?.key || session.key;

      if (onChange) {
        onChange(finalVideoKey);
      }

      if (onUploadSuccess) {
        onUploadSuccess(video);
      }

      clearSession(storageKey);
      setHasSavedUpload(getAnySavedUploadExists());

      setProgress(100);
      setMessage("Video uploaded. HLS processing started.");
      setPaused(false);
    } catch (err) {
      if (err.message === "UPLOAD_PAUSED") {
        setPaused(true);
        setMessage("Upload paused. Click Resume Upload to continue.");
        setError("");
        return;
      }

      console.error("VIDEO_UPLOAD_ERROR:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Video upload failed",
      );

      setMessage("");
    } finally {
      setUploading(false);
      xhrRef.current = null;

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    await startOrResumeUpload(file);
  };

  const handlePauseUpload = () => {
    if (!uploading) return;

    pausedRef.current = true;
    xhrRef.current?.abort();
  };

  const handleResumeUpload = async () => {
    if (selectedFile) {
      await startOrResumeUpload(selectedFile);
      return;
    }

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
      setUploading(false);
      setPaused(false);
      setProgress(0);
      setMessage("Upload cancelled.");
      setError("");
      setHasSavedUpload(getAnySavedUploadExists());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to cancel upload",
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
          <p className="text-sm font-semibold text-emerald-300">
            Video selected
          </p>

          <p className="break-all rounded-xl bg-slate-900 p-3 text-xs text-slate-400">
            {value}
          </p>

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
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/70 px-4 py-8 text-center">
          <p className="text-sm text-slate-300">Video is not available.</p>

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
          </div>

          {hasSavedUpload && !selectedFile && (
            <p className="text-xs text-yellow-300">
              To resume, choose the same video file again.
            </p>
          )}
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
