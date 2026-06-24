import { useState } from "react";
import { UploadCloud, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../../services/api";

const VideoUploadField = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("video", file);

      const res = await api.post("/videos/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (event) => {
          if (!event.total) return;

          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(percent);
        },
      });

      onChange(res.data.videoSource);
      setMessage("Video uploaded successfully");
    } catch (error) {
      console.error("Video upload failed", error);

      setError(error.response?.data?.message || "Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-300">
        Lesson Video
      </label>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/5 p-6 cursor-pointer hover:bg-blue-500/10">
          {uploading ? (
            <Loader2 className="animate-spin text-blue-300" size={34} />
          ) : (
            <UploadCloud className="text-blue-300" size={34} />
          )}

          <div className="text-center">
            <p className="font-bold text-white">
              {uploading ? "Uploading video..." : "Upload video to S3"}
            </p>

            <p className="text-sm text-slate-400 mt-1">
              MP4, WebM, or MOV supported
            </p>
          </div>

          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Uploading</span>
              <span className="font-bold text-blue-300">{progress}%</span>
            </div>

            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {value && (
          <div className="mt-4 rounded-xl bg-green-500/10 border border-green-500/20 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle size={18} className="text-green-300 mt-0.5" />

              <div>
                <p className="text-sm font-bold text-green-300">
                  Current video source
                </p>

                <p className="text-xs text-slate-300 break-all mt-1">
                  {value}
                </p>
              </div>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-green-300 mt-3">{message}</p>}

        {error && <p className="text-sm text-red-300 mt-3">{error}</p>}
      </div>
    </div>
  );
};

export default VideoUploadField;