import axios from "axios";
import { useRef, useState } from "react";
import {
  CheckCircle,
  Copy,
  Loader2,
  RotateCcw,
  StopCircle,
  UploadCloud,
} from "lucide-react";
import { api } from "../../services/api";

const DirectS3VideoUpload = ({ onUploaded }) => {
  const abortControllerRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSelectedFile(file || null);
    setUploadedVideo(null);
    setUploading(false);
    setCancelled(false);
    setError("");
    setProgress(0);
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setError("Please select a video file");
      return;
    }

    try {
      setUploading(true);
      setCancelled(false);
      setError("");
      setUploadedVideo(null);
      setProgress(0);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const presignRes = await api.post("/videos/admin/presign-upload", {
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      const { uploadUrl, key } = presignRes.data;

      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type,
        },
        withCredentials: false,
        timeout: 0,
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;

          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          setProgress(percent);
        },
      });

      const confirmRes = await api.post("/videos/admin/confirm-upload", {
        key,
        originalName: selectedFile.name,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      setUploadedVideo(confirmRes.data.video);
      setProgress(100);

      if (onUploaded) {
        onUploaded(confirmRes.data.video);
      }
    } catch (error) {
      const isCancelled =
        error.name === "CanceledError" ||
        error.code === "ERR_CANCELED" ||
        error.message === "canceled";

      if (isCancelled) {
        setCancelled(true);
        setError("");
        return;
      }

      console.error("Direct S3 upload failed:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload video"
      );
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setUploading(false);
    setCancelled(true);
  };

  const handleResumeUpload = () => {
    uploadFile();
  };

  const copyKey = async () => {
    if (!uploadedVideo?.key) return;

    await navigator.clipboard.writeText(uploadedVideo.key);
  };

  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-300 flex items-center justify-center">
          <UploadCloud size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">Direct S3 Upload</h2>
          <p className="text-slate-400 text-sm">
            Upload videos directly to S3 using signed upload URLs.
          </p>
        </div>
      </div>

      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white file:font-bold disabled:opacity-60"
      />

      {selectedFile && (
        <div className="mt-4 rounded-2xl bg-slate-900 border border-white/10 p-4 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">File:</span> {selectedFile.name}
          </p>

          <p>
            <span className="text-slate-500">Size:</span>{" "}
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>

          <p>
            <span className="text-slate-500">Type:</span>{" "}
            {selectedFile.type || "Unknown"}
          </p>
        </div>
      )}

      {(uploading || cancelled || progress > 0) && !uploadedVideo && (
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">
              {uploading
                ? "Uploading to S3..."
                : cancelled
                ? "Upload cancelled"
                : "Upload progress"}
            </span>

            <span className="font-bold text-blue-300">{progress}%</span>
          </div>

          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                cancelled ? "bg-yellow-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {cancelled && (
            <p className="text-xs text-yellow-300 mt-2">
              Upload was cancelled. Click Resume Upload to start again safely.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {uploadedVideo && (
        <div className="mt-5 rounded-2xl bg-green-500/10 border border-green-500/20 p-4">
          <div className="flex items-center gap-2 text-green-300 font-bold">
            <CheckCircle size={20} />
            Upload completed
          </div>

          <div className="mt-3 rounded-xl bg-slate-950 p-3 text-sm text-slate-300 break-all">
            {uploadedVideo.key}
          </div>

          <button
            onClick={copyKey}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <Copy size={16} />
            Copy Video Key
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        {!uploading && !cancelled && !uploadedVideo && (
          <button
            onClick={uploadFile}
            disabled={!selectedFile}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <UploadCloud size={18} />
            Upload Directly to S3
          </button>
        )}

        {uploading && (
          <button
            onClick={handleCancelUpload}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black flex items-center justify-center gap-2"
          >
            <StopCircle size={18} />
            Cancel Upload
          </button>
        )}

        {cancelled && !uploading && !uploadedVideo && (
          <button
            onClick={handleResumeUpload}
            disabled={!selectedFile}
            className="w-full py-3 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Resume Upload
          </button>
        )}

        {uploading && (
          <div className="w-full py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={18} />
            Uploading {progress}%
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectS3VideoUpload;