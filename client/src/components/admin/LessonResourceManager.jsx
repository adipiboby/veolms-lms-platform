import { useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { api } from "../../services/api";

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
  return resource?.type || resource?.mimeType || resource?.fileType || "file";
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

const LessonResourceManager = ({
  courseId,
  lesson,
  resources = [],
  onResourcesChange,
}) => {
  const lessonId = lesson?._id;

  const [selectedFile, setSelectedFile] = useState(null);
  const [resourceTitle, setResourceTitle] = useState("");

  const [uploading, setUploading] = useState(false);
  const [openingResourceId, setOpeningResourceId] = useState("");
  const [deletingResourceId, setDeletingResourceId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateResources = (nextResources) => {
    if (typeof onResourcesChange === "function") {
      onResourcesChange(nextResources);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setMessage("");
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    if (!resourceTitle.trim()) {
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setResourceTitle(fileNameWithoutExtension);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setResourceTitle("");
    setMessage("");
    setError("");
  };

  const handleUploadResource = async () => {
    if (!courseId || !lessonId) {
      setError("Course or lesson id is missing. Save the course first.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a resource file.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setError("");

      const mimeType = selectedFile.type || "application/octet-stream";

      const uploadUrlResponse = await api.post("/lesson-resources/upload-url", {
        courseId,
        lessonId,
        fileName: selectedFile.name,
        mimeType,
        size: selectedFile.size,
        title: resourceTitle.trim() || selectedFile.name,
      });

      const uploadUrl = uploadUrlResponse.data.uploadUrl;
      const resource = uploadUrlResponse.data.resource;

      if (!uploadUrl || !resource?.fileKey) {
        throw new Error("Upload URL not received from server.");
      }

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: selectedFile,
      });

      if (!s3Response.ok) {
        throw new Error("File upload to S3 failed.");
      }

      const saveResponse = await api.post("/lesson-resources/save", {
        courseId,
        lessonId,
        resourceId: resource._id,
        title: resourceTitle.trim() || selectedFile.name,
        fileName: resource.fileName,
        fileKey: resource.fileKey,
        mimeType: resource.mimeType,
        size: resource.size,
        type: resource.type,
      });

      const savedResource = saveResponse.data.resource;

      updateResources([...(resources || []), savedResource]);

      setSelectedFile(null);
      setResourceTitle("");
      setMessage("Resource uploaded successfully.");
    } catch (uploadError) {
      console.error("LESSON_RESOURCE_UPLOAD_ERROR:", uploadError);

      setError(
        uploadError?.response?.data?.message ||
          uploadError?.message ||
          "Unable to upload resource. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleOpenResource = async (resource) => {
    if (!courseId || !lessonId || !resource?._id) return;

    try {
      setOpeningResourceId(resource._id);
      setError("");
      setMessage("");

      const response = await api.get(
        `/lesson-resources/download-url/${courseId}/${lessonId}/${resource._id}`,
      );

      const downloadUrl = response.data.downloadUrl;

      if (!downloadUrl) {
        throw new Error("Download URL not received.");
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      console.error("OPEN_LESSON_RESOURCE_ERROR:", openError);

      setError(
        openError?.response?.data?.message ||
          openError?.message ||
          "Unable to open resource.",
      );
    } finally {
      setOpeningResourceId("");
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!courseId || !lessonId || !resource?._id) return;

    const confirmDelete = window.confirm(
      `Delete resource "${getResourceTitle(resource)}"?`,
    );

    if (!confirmDelete) return;

    try {
      setDeletingResourceId(resource._id);
      setError("");
      setMessage("");

      await api.delete(
        `/lesson-resources/${courseId}/${lessonId}/${resource._id}`,
      );

      const nextResources = (resources || []).filter((item) => {
        return String(item._id) !== String(resource._id);
      });

      updateResources(nextResources);
      setMessage("Resource deleted successfully.");
    } catch (deleteError) {
      console.error("DELETE_LESSON_RESOURCE_ERROR:", deleteError);

      setError(
        deleteError?.response?.data?.message ||
          "Unable to delete resource. Please try again.",
      );
    } finally {
      setDeletingResourceId("");
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300">
            <Paperclip size={22} />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Lesson Resources
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Upload PDF, ZIP, PPT, DOCX, images, or notes for this lesson.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
          {(resources || []).length} files
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-bold text-green-200">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label className="block text-sm font-bold text-slate-300">
          Resource title
        </label>

        <input
          type="text"
          value={resourceTitle}
          onChange={(event) => setResourceTitle(event.target.value)}
          placeholder="Example: React Notes PDF"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400/50"
        />

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/70 p-6 text-center hover:bg-slate-900">
          <UploadCloud size={34} className="text-purple-300" />

          <p className="mt-3 font-black text-white">
            {selectedFile ? selectedFile.name : "Choose resource file"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            PDF, ZIP, DOCX, PPT, image, or any learning file
          </p>

          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.zip,.rar,.7z,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.md"
          />
        </label>

        {selectedFile && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="min-w-0">
              <p className="truncate font-black text-white">
                {selectedFile.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {selectedFile.type || "unknown"}{" "}
                {selectedFile.size ? `• ${getResourceSize(selectedFile)}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleUploadResource}
          disabled={uploading || !selectedFile}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-black text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <UploadCloud size={18} />
          )}
          {uploading ? "Uploading Resource..." : "Upload Resource"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {(resources || []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
            <FileText size={30} className="mx-auto text-slate-500" />

            <p className="mt-3 font-black text-white">
              No resources uploaded yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Uploaded files will appear here and students can download them
              from the learning page.
            </p>
          </div>
        ) : (
          resources.map((resource) => (
            <article
              key={resource._id || resource.fileKey}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                <FileText size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate font-black text-white">
                  {getResourceTitle(resource)}
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  {getResourceType(resource)}
                  {getResourceSize(resource)
                    ? ` • ${getResourceSize(resource)}`
                    : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenResource(resource)}
                  disabled={openingResourceId === resource._id}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-60"
                >
                  {openingResourceId === resource._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Open
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteResource(resource)}
                  disabled={deletingResourceId === resource._id}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                >
                  {deletingResourceId === resource._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default LessonResourceManager;