import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  Pin,
  Plus,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const formatDateTime = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const getUser = (value) => {
  return value?.authorId || value?.userId || value?.user || null;
};

const getUserName = (value) => {
  const user = getUser(value);
  return user?.name || user?.email?.split("@")[0] || "User";
};

const getUserRole = (value) => {
  const user = getUser(value);
  return user?.role || "";
};

const getAvatar = (value) => {
  const user = getUser(value);

  return (
    user?.avatar ||
    user?.photo ||
    user?.profilePhoto ||
    user?.profileImage ||
    user?.picture ||
    ""
  );
};

const getInitial = (name = "") => {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?._id || value?.id || "";
};

const isSameId = (a, b) => {
  return Boolean(a && b && String(a) === String(b));
};

const getCurrentUserId = (user) => {
  return user?._id || user?.id || "";
};

const UserAvatar = ({ item, size = "md" }) => {
  const name = getUserName(item);
  const avatar = getAvatar(item);
  const role = getUserRole(item);

  const sizeClass = size === "sm" ? "h-8 w-8" : "h-11 w-11";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/10`}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-black ${
            role === "admin"
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white"
          }`}
        >
          {getInitial(name)}
        </div>
      )}
    </div>
  );
};

const RoleBadge = ({ role }) => {
  if (role !== "admin") return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
      <ShieldCheck size={12} />
      Admin
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  if (priority === "urgent") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
        Urgent
      </span>
    );
  }

  if (priority === "important") {
    return (
      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
        Important
      </span>
    );
  }

  return null;
};

const categoryLabels = {
  general: "General",
  announcement: "Announcement",
  achievement: "Achievement",
  update: "Update",
};

const priorityWeight = {
  urgent: 3,
  important: 2,
  normal: 1,
};

const feedCategoryTabs = [
  { label: "All", value: "all" },
  { label: "General", value: "general" },
  { label: "Announcements", value: "announcement" },
  { label: "Achievements", value: "achievement" },
  { label: "Updates", value: "update" },
];

const FeedPage = () => {
  const { user, isAuthenticated } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibility, setVisibility] = useState("public");
  const [courseId, setCourseId] = useState("");

  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [commentMessages, setCommentMessages] = useState({});
  const [replyMessages, setReplyMessages] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});

  const currentUserId = getCurrentUserId(user);
  const isAdmin = user?.role === "admin";
  const canCreatePost = isAdmin;

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a?.isPinned && !b?.isPinned) return -1;
      if (!a?.isPinned && b?.isPinned) return 1;

      const priorityDiff =
        (priorityWeight[b?.priority] || 1) - (priorityWeight[a?.priority] || 1);

      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") return sortedPosts;

    return sortedPosts.filter((post) => post?.category === selectedCategory);
  }, [selectedCategory, sortedPosts]);

  const resetPostForm = () => {
    setEditingPostId("");
    setTitle("");
    setContent("");
    setCategory("general");
    setPriority("normal");
    setVisibility("public");
    setCourseId("");
    setUploadedImages([]);
  };

  const closePostForm = () => {
    resetPostForm();
    setFormOpen(false);
  };

  const openCreateForm = () => {
    resetPostForm();
    setError("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/feed");

      const loadedPosts = data?.posts || data?.data || [];

      setPosts(Array.isArray(loadedPosts) ? loadedPosts : []);
    } catch (error) {
      console.error("FEED_FETCH_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to load feed posts.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const markFeedAsRead = async () => {
    try {
      await api.patch("/feed/mark-read", {});

      window.dispatchEvent(new Event("feed-read-updated"));
    } catch (error) {
      console.error("MARK_FEED_AS_READ_ERROR:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadFeed = async () => {
      await fetchPosts();
      await markFeedAsRead();
    };

    loadFeed();
  }, [isAuthenticated]);

  const replacePost = (updatedPost) => {
    if (!updatedPost?._id) return;

    setPosts((previousPosts) =>
      previousPosts.map((post) =>
        post?._id === updatedPost._id ? updatedPost : post,
      ),
    );
  };

  const handleStartEditPost = (post) => {
    setEditingPostId(post?._id || "");
    setTitle(post?.title || "");
    setContent(post?.content || "");
    setCategory(post?.category || "general");
    setPriority(post?.priority || "normal");
    setVisibility(post?.visibility || "public");
    setCourseId(getId(post?.courseId));
    setUploadedImages(Array.isArray(post?.attachments) ? post.attachments : []);
    setError("");
    setSuccessMessage("");
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleUploadImages = async (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    try {
      setImageUploading(true);
      setError("");
      setSuccessMessage("");

      const uploaded = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError("Each image must be less than 5MB.");
          continue;
        }

        const formData = new FormData();
        formData.append("image", file);

        const { data } = await api.post("/feed/admin/upload-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (data?.attachment) {
          uploaded.push(data.attachment);
        }
      }

      if (uploaded.length > 0) {
        setUploadedImages((previousImages) => [...previousImages, ...uploaded]);
        setSuccessMessage("Image uploaded successfully.");
      }
    } catch (error) {
      console.error("FEED_IMAGE_UPLOAD_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to upload image.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmitPost = async (event) => {
    event.preventDefault();

    if (!canCreatePost) {
      setError("Only admin can create or edit feed posts.");
      return;
    }

    if (!content.trim()) {
      setError("Post content is required.");
      return;
    }

    try {
      setPosting(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        visibility,
        attachments: uploadedImages,
      };

      if (visibility === "course" && courseId.trim()) {
        payload.courseId = courseId.trim();
      }

      if (editingPostId) {
        const { data } = await api.patch(`/feed/${editingPostId}`, payload);

        if (data?.post) {
          replacePost(data.post);
        } else {
          await fetchPosts();
        }

        closePostForm();
        setSuccessMessage("Post updated successfully.");
        return;
      }

      const { data } = await api.post("/feed", payload);

      if (data?.post) {
        setPosts((previousPosts) => [data.post, ...previousPosts]);
      } else {
        await fetchPosts();
      }

      setSelectedCategory("all");
      closePostForm();
      setSuccessMessage("Post created successfully.");
    } catch (error) {
      console.error("FEED_SUBMIT_ERROR:", error);

      setError(
        error?.response?.data?.message ||
          (editingPostId ? "Unable to update post." : "Unable to create post."),
      );
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post) => {
    try {
      setActionLoadingId(`like-${post?._id}`);
      setError("");
      setSuccessMessage("");

      const { data } = await api.patch(`/feed/${post?._id}/like`);

      if (data?.post) {
        replacePost(data.post);
      }
    } catch (error) {
      console.error("FEED_LIKE_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to update like.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handlePin = async (post) => {
    try {
      setActionLoadingId(`pin-${post?._id}`);
      setError("");
      setSuccessMessage("");

      const { data } = await api.patch(`/feed/${post?._id}/pin`);

      if (data?.post) {
        replacePost(data.post);
      }
    } catch (error) {
      console.error("FEED_PIN_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to update pin.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeletePost = async (post) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?",
    );

    if (!confirmDelete) return;

    try {
      setActionLoadingId(`delete-${post?._id}`);
      setError("");
      setSuccessMessage("");

      await api.delete(`/feed/${post?._id}`);

      setPosts((previousPosts) =>
        previousPosts.filter((item) => item?._id !== post?._id),
      );

      if (editingPostId === post?._id) {
        closePostForm();
      }

      setSuccessMessage("Post deleted successfully.");
    } catch (error) {
      console.error("FEED_DELETE_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to delete post.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleAddComment = async (post) => {
    const message = commentMessages[post?._id]?.trim();

    if (!message) return;

    try {
      setActionLoadingId(`comment-${post?._id}`);
      setError("");
      setSuccessMessage("");

      const { data } = await api.post(`/feed/${post?._id}/comments`, {
        message,
      });

      if (data?.post) {
        replacePost(data.post);
      }

      setCommentMessages((previous) => ({
        ...previous,
        [post._id]: "",
      }));

      setCommentsOpen((previous) => ({
        ...previous,
        [post._id]: true,
      }));
    } catch (error) {
      console.error("FEED_COMMENT_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to add comment.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleAddReply = async (post, comment) => {
    const replyKey = `${post?._id}:${comment?._id}`;
    const message = replyMessages[replyKey]?.trim();

    if (!message) return;

    try {
      setActionLoadingId(`reply-${replyKey}`);
      setError("");
      setSuccessMessage("");

      const { data } = await api.post(
        `/feed/${post?._id}/comments/${comment?._id}/replies`,
        {
          message,
        },
      );

      if (data?.post) {
        replacePost(data.post);
      }

      setReplyMessages((previous) => ({
        ...previous,
        [replyKey]: "",
      }));
    } catch (error) {
      console.error("FEED_REPLY_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to add reply.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteComment = async (post, comment) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this comment?",
    );

    if (!confirmDelete) return;

    try {
      setActionLoadingId(`delete-comment-${comment?._id}`);

      const { data } = await api.delete(
        `/feed/${post?._id}/comments/${comment?._id}`,
      );

      if (data?.post) {
        replacePost(data.post);
      }
    } catch (error) {
      console.error("FEED_COMMENT_DELETE_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to delete comment.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteReply = async (post, comment, reply) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this reply?",
    );

    if (!confirmDelete) return;

    try {
      setActionLoadingId(`delete-reply-${reply?._id}`);

      const { data } = await api.delete(
        `/feed/${post?._id}/comments/${comment?._id}/replies/${reply?._id}`,
      );

      if (data?.post) {
        replacePost(data.post);
      }
    } catch (error) {
      console.error("FEED_REPLY_DELETE_ERROR:", error);

      setError(error?.response?.data?.message || "Unable to delete reply.");
    } finally {
      setActionLoadingId("");
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          <MessageCircle
            size={44}
            className="mx-auto text-blue-600 dark:text-blue-300"
          />

          <h1 className="mt-4 text-3xl font-black">Community Feed</h1>

          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Please login to view official announcements and updates.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
              Official Feed
            </p>

            <h1 className="text-4xl font-black">Learning Feed</h1>

            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              View official announcements, general updates, achievements, and
              important messages from the admin team.
            </p>
          </div>

          {canCreatePost && (
            <button
              type="button"
              onClick={() => {
                if (formOpen) {
                  closePostForm();
                } else {
                  openCreateForm();
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
            >
              {formOpen ? <X size={18} /> : <Plus size={18} />}
              {formOpen ? "Close" : "Create Post"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            {successMessage}
          </div>
        )}

        {!canCreatePost && (
          <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-bold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            This feed is managed by admin. Students can view official general
            posts, announcements, achievements, and updates here.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
          {feedCategoryTabs.map((tab) => {
            const isActive = selectedCategory === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedCategory(tab.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {canCreatePost && formOpen && (
          <form
            onSubmit={handleSubmitPost}
            className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  {editingPostId ? "Edit Feed Post" : "Create Feed Post"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {editingPostId
                    ? "Update the existing official feed post."
                    : "Create an official post for students."}
                </p>
              </div>

              {editingPostId && (
                <button
                  type="button"
                  onClick={closePostForm}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mb-4 flex items-start gap-3">
              <UserAvatar item={{ userId: user }} />

              <div className="flex-1">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Post title optional..."
                  className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                />

                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={5}
                  maxLength={3000}
                  placeholder="Write an official announcement, update, achievement, or general post..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                />

                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-4 py-5 text-center hover:bg-slate-100 dark:hover:bg-white/5">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      multiple
                      onChange={handleUploadImages}
                      className="hidden"
                      disabled={imageUploading}
                    />

                    {imageUploading ? (
                      <Loader2
                        size={28}
                        className="animate-spin text-blue-600 dark:text-blue-300"
                      />
                    ) : (
                      <UploadCloud
                        size={28}
                        className="text-blue-600 dark:text-blue-300"
                      />
                    )}

                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {imageUploading
                        ? "Uploading image..."
                        : "Upload feed images"}
                    </span>

                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      PNG, JPG, WEBP — max 5MB each
                    </span>
                  </label>

                  {uploadedImages.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {uploadedImages.map((image, index) => (
                        <div
                          key={`${image.url}-${index}`}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                        >
                          <img
                            src={image.url}
                            alt={image.title || "Feed image"}
                            className="h-36 w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setUploadedImages((previousImages) =>
                                previousImages.filter(
                                  (_, imageIndex) => imageIndex !== index,
                                ),
                              )
                            }
                            className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white shadow-lg hover:bg-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
              >
                <option value="general">General</option>
                <option value="announcement">Announcement</option>
                <option value="achievement">Achievement</option>
                <option value="update">Update</option>
              </select>

              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
              >
                <option value="normal">Normal Priority</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>

              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
              >
                <option value="public">Public</option>
                <option value="students">Students</option>
                <option value="course">Course Specific</option>
              </select>

              {visibility === "course" && (
                <input
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  placeholder="Paste course id"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="text-xs text-slate-500">
                {content.length}/3000 characters
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={closePostForm}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={posting || imageUploading || !content.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {posting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      {editingPostId ? "Updating..." : "Posting..."}
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      {editingPostId ? "Update Post" : "Post"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <Loader2
              size={40}
              className="animate-spin text-blue-500 dark:text-blue-400"
            />

            <p className="mt-4 font-semibold text-slate-600 dark:text-slate-400">
              Loading feed...
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
            <MessageCircle
              size={44}
              className="mx-auto text-blue-600 dark:text-blue-300"
            />

            <h2 className="mt-4 text-2xl font-black">No posts found</h2>

            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {selectedCategory === "all"
                ? "Admin can create the first official feed post."
                : `No ${categoryLabels[
                    selectedCategory
                  ]?.toLowerCase()} posts yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredPosts.map((post) => {
              const authorName = getUserName(post);
              const authorRole = getUserRole(post);
              const authorId = getId(post?.authorId);

              const liked = Array.isArray(post?.likes)
                ? post.likes.some((id) => isSameId(id, currentUserId))
                : false;

              const comments = Array.isArray(post?.comments)
                ? post.comments
                : [];

              const imageAttachments = Array.isArray(post?.attachments)
                ? post.attachments.filter(
                    (attachment) =>
                      attachment?.type === "image" && attachment?.url,
                  )
                : [];

              const canDeletePost =
                isAdmin || isSameId(authorId, currentUserId);

              return (
                <article
                  key={post?._id}
                  className={`rounded-3xl border p-5 shadow-xl transition ${
                    post?.isPinned
                      ? "border-yellow-200 bg-yellow-50 shadow-yellow-100/70 dark:border-yellow-400/20 dark:bg-yellow-500/10 dark:shadow-black/20"
                      : post?.priority === "urgent"
                        ? "border-red-200 bg-red-50 shadow-red-100/70 dark:border-red-400/20 dark:bg-red-500/10 dark:shadow-black/20"
                        : post?.priority === "important"
                          ? "border-orange-200 bg-orange-50 shadow-orange-100/70 dark:border-orange-400/20 dark:bg-orange-500/10 dark:shadow-black/20"
                          : "border-slate-200 bg-white shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar item={post} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950 dark:text-white">
                          {authorName}
                        </h3>

                        <RoleBadge role={authorRole} />

                        {post?.isPinned && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-100 px-2.5 py-1 text-xs font-black text-yellow-700 dark:border-yellow-400/30 dark:bg-yellow-500/10 dark:text-yellow-200">
                            <Pin size={12} />
                            Pinned
                          </span>
                        )}

                        <PriorityBadge priority={post?.priority || "normal"} />

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                          {categoryLabels[post?.category] || "General"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(post?.createdAt)}
                      </p>

                      {post?.title && (
                        <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                          {post.title}
                        </h2>
                      )}

                      <p className="mt-3 whitespace-pre-line break-words leading-7 text-slate-700 dark:text-slate-300">
                        {post?.content}
                      </p>

                      {imageAttachments.length > 0 && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {imageAttachments.map((attachment, index) => (
                            <button
                              key={`${attachment.url}-${index}`}
                              type="button"
                              onClick={() => setPreviewImage(attachment)}
                              className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left dark:border-white/10 dark:bg-slate-950/60"
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.title || "Feed image"}
                                className="h-64 w-full object-cover transition duration-300 group-hover:scale-105"
                                loading="lazy"
                              />

                              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <ImageIcon size={14} />
                                Click to preview image
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLike(post)}
                          disabled={actionLoadingId === `like-${post?._id}`}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition disabled:opacity-60 ${
                            liked
                              ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                          }`}
                        >
                          <Heart
                            size={16}
                            className={liked ? "fill-current" : ""}
                          />
                          {post?.likes?.length || 0}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setCommentsOpen((previous) => ({
                              ...previous,
                              [post._id]: !previous[post._id],
                            }))
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          <MessageCircle size={16} />
                          {comments.length} comments
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditPost(post)}
                              disabled={posting}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePin(post)}
                              disabled={actionLoadingId === `pin-${post?._id}`}
                              className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
                            >
                              <Pin size={16} />
                              {post?.isPinned ? "Unpin" : "Pin"}
                            </button>
                          </>
                        )}

                        {canDeletePost && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post)}
                            disabled={actionLoadingId === `delete-${post?._id}`}
                            className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        )}
                      </div>

                      {commentsOpen[post._id] && (
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                          <div className="mb-4 flex gap-3">
                            <UserAvatar item={{ userId: user }} size="sm" />

                            <div className="flex-1">
                              <textarea
                                value={commentMessages[post._id] || ""}
                                onChange={(event) =>
                                  setCommentMessages((previous) => ({
                                    ...previous,
                                    [post._id]: event.target.value,
                                  }))
                                }
                                rows={2}
                                maxLength={1000}
                                placeholder="Write a comment..."
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                              />

                              <button
                                type="button"
                                onClick={() => handleAddComment(post)}
                                disabled={
                                  actionLoadingId === `comment-${post?._id}` ||
                                  !commentMessages[post._id]?.trim()
                                }
                                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Send size={15} />
                                Comment
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {comments.map((comment) => {
                              const commentAuthorId = getId(comment?.userId);
                              const canDeleteComment =
                                isAdmin ||
                                isSameId(commentAuthorId, currentUserId);

                              const replyKey = `${post?._id}:${comment?._id}`;
                              const replies = Array.isArray(comment?.replies)
                                ? comment.replies
                                : [];

                              return (
                                <div
                                  key={comment?._id}
                                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
                                >
                                  <div className="flex items-start gap-3">
                                    <UserAvatar item={comment} size="sm" />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-black text-slate-950 dark:text-white">
                                          {getUserName(comment)}
                                        </h4>

                                        <RoleBadge
                                          role={getUserRole(comment)}
                                        />

                                        <span className="text-xs text-slate-500">
                                          {formatDateTime(comment?.createdAt)}
                                        </span>
                                      </div>

                                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                                        {comment?.message}
                                      </p>

                                      <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setReplyMessages((previous) => ({
                                              ...previous,
                                              [replyKey]:
                                                previous[replyKey] || "",
                                            }))
                                          }
                                          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                        >
                                          <Reply size={13} />
                                          Reply
                                        </button>

                                        {canDeleteComment && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteComment(post, comment)
                                            }
                                            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                                          >
                                            <Trash2 size={13} />
                                            Delete
                                          </button>
                                        )}
                                      </div>

                                      {replyMessages[replyKey] !==
                                        undefined && (
                                        <div className="mt-3">
                                          <textarea
                                            value={replyMessages[replyKey]}
                                            onChange={(event) =>
                                              setReplyMessages((previous) => ({
                                                ...previous,
                                                [replyKey]: event.target.value,
                                              }))
                                            }
                                            rows={2}
                                            maxLength={1000}
                                            placeholder="Write a reply..."
                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                          />

                                          <div className="mt-2 flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAddReply(post, comment)
                                              }
                                              disabled={
                                                actionLoadingId ===
                                                  `reply-${replyKey}` ||
                                                !replyMessages[replyKey]?.trim()
                                              }
                                              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              <Send size={14} />
                                              Reply
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                setReplyMessages((previous) => {
                                                  const updated = {
                                                    ...previous,
                                                  };
                                                  delete updated[replyKey];
                                                  return updated;
                                                })
                                              }
                                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {replies.length > 0 && (
                                        <div className="mt-4 space-y-3 border-l border-slate-200 pl-4 dark:border-white/10">
                                          {replies.map((reply) => {
                                            const replyAuthorId = getId(
                                              reply?.userId,
                                            );

                                            const canDeleteReply =
                                              isAdmin ||
                                              isSameId(
                                                replyAuthorId,
                                                currentUserId,
                                              );

                                            return (
                                              <div
                                                key={reply?._id}
                                                className="flex gap-3"
                                              >
                                                <UserAvatar
                                                  item={reply}
                                                  size="sm"
                                                />

                                                <div className="min-w-0 flex-1">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <h5 className="text-sm font-black text-slate-950 dark:text-white">
                                                      {getUserName(reply)}
                                                    </h5>

                                                    <RoleBadge
                                                      role={getUserRole(reply)}
                                                    />

                                                    <span className="text-xs text-slate-500">
                                                      {formatDateTime(
                                                        reply?.createdAt,
                                                      )}
                                                    </span>
                                                  </div>

                                                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                                                    {reply?.message}
                                                  </p>

                                                  {canDeleteReply && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDeleteReply(
                                                          post,
                                                          comment,
                                                          reply,
                                                        )
                                                      }
                                                      className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                                                    >
                                                      <Trash2 size={13} />
                                                      Delete
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-3 text-white shadow-lg hover:bg-red-600"
              aria-label="Close image preview"
            >
              <X size={22} />
            </button>

            <div className="flex max-h-[92vh] items-center justify-center bg-black">
              <img
                src={previewImage.url}
                alt={previewImage.title || "Feed image preview"}
                className="max-h-[92vh] w-full object-contain"
              />
            </div>

            {previewImage.title && (
              <div className="border-t border-white/10 bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                {previewImage.title}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default FeedPage;
