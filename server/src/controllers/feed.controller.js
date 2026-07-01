import FeedPost from "../models/feedPost.model.js";
import FeedRead from "../models/feedRead.model.js";

import {
  deleteS3ObjectsByKeys,
  getAttachmentKeys,
} from "../utils/s3Cleanup.util.js";

import { notifyAllStudents } from "../utils/notification.util.js";

const userSelect =
  "name email role avatar photo profilePhoto profileImage picture";
const courseSelect = "title slug thumbnail thumbnailUrl image coverImage";

const allowedCategories = ["general", "announcement", "achievement", "update"];
const allowedVisibility = ["public", "students", "course"];
const allowedPriorities = ["normal", "important", "urgent"];

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const isAdmin = (req) => {
  return req.user?.role === "admin";
};

const isSameId = (a, b) => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

const populateFeedPost = (query) => {
  return query
    .populate("authorId", userSelect)
    .populate("courseId", courseSelect)
    .populate("comments.userId", userSelect)
    .populate("comments.replies.userId", userSelect);
};

const buildFeedNotificationMessage = ({ title, content }) => {
  const cleanTitle = String(title || "").trim();
  const cleanContent = String(content || "").trim();

  if (cleanTitle) return cleanTitle;

  if (cleanContent.length <= 120) return cleanContent;

  return `${cleanContent.slice(0, 120)}...`;
};

const notifyStudentsForPriorityFeedPost = async ({
  createdBy,
  post,
  title,
  content,
  category,
  priority,
}) => {
  try {
    if (priority !== "important" && priority !== "urgent") return;

    await notifyAllStudents({
      createdBy,
      type: "feed",
      title:
        priority === "urgent"
          ? "Urgent feed announcement"
          : "Important feed announcement",
      message: buildFeedNotificationMessage({ title, content }),
      priority,
      link: "/feed",
      metadata: {
        postId: post?._id,
        category,
      },
    });
  } catch (error) {
    console.error("FEED_NOTIFICATION_CREATE_ERROR:", error);
  }
};

export const createFeedPost = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admin can create feed posts.",
      });
    }

    const {
      title = "",
      content,
      category = "general",
      priority = "normal",
      visibility = "public",
      courseId = null,
      attachments = [],
    } = req.body || {};

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Post content is required.",
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed category.",
      });
    }

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed priority.",
      });
    }

    if (!allowedVisibility.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed visibility.",
      });
    }

    if (visibility === "course" && !courseId) {
      return res.status(400).json({
        success: false,
        message: "Course is required for course-specific posts.",
      });
    }

    const post = await FeedPost.create({
      authorId: userId,
      courseId: visibility === "course" ? courseId : null,
      title,
      content,
      category,
      priority,
      visibility,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    await notifyStudentsForPriorityFeedPost({
      createdBy: userId,
      post,
      title,
      content,
      category,
      priority,
    });

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(201).json({
      success: true,
      message: "Feed post created successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("CREATE_FEED_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create feed post.",
    });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { category, courseId, visibility, page = 1, limit = 20 } = req.query;

    const filter = {
      isArchived: false,
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (visibility && visibility !== "all") {
      filter.visibility = visibility;
    }

    if (courseId) {
      filter.courseId = courseId;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [posts, totalPosts] = await Promise.all([
      populateFeedPost(
        FeedPost.find(filter)
          .sort({ isPinned: -1, createdAt: -1 })
          .skip(skip)
          .limit(safeLimit),
      ),
      FeedPost.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      posts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / safeLimit),
      },
    });
  } catch (error) {
    console.error("GET_FEED_POSTS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load feed posts.",
    });
  }
};

export const getUnreadFeedCount = async (req, res) => {
  try {
    const userId = getUserId(req);

    const readState = await FeedRead.findOne({ userId }).lean();

    const lastReadAt = readState?.lastReadAt || new Date(0);

    const unreadCount = await FeedPost.countDocuments({
      isArchived: false,
      createdAt: { $gt: lastReadAt },
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      lastReadAt,
    });
  } catch (error) {
    console.error("GET_UNREAD_FEED_COUNT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load unread feed count.",
    });
  }
};

export const markFeedAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const now = new Date();

    await FeedRead.findOneAndUpdate(
      { userId },
      {
        $set: {
          lastReadAt: now,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Feed marked as read.",
      unreadCount: 0,
      lastReadAt: now,
    });
  } catch (error) {
    console.error("MARK_FEED_AS_READ_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to mark feed as read.",
    });
  }
};

export const getFeedPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await populateFeedPost(
      FeedPost.findOne({
        _id: postId,
        isArchived: false,
      }),
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("GET_FEED_POST_BY_ID_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load feed post.",
    });
  }
};

export const updateFeedPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admin can edit feed posts.",
      });
    }

    const {
      title = "",
      content,
      category = "general",
      priority = "normal",
      visibility = "public",
      courseId = null,
      attachments = [],
    } = req.body || {};

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Post content is required.",
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed category.",
      });
    }

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed priority.",
      });
    }

    if (!allowedVisibility.includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feed visibility.",
      });
    }

    if (visibility === "course" && !courseId) {
      return res.status(400).json({
        success: false,
        message: "Course is required for course-specific posts.",
      });
    }

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const oldPriority = post.priority || "normal";

    const oldAttachmentKeys = getAttachmentKeys(post.attachments);
    const newAttachments = Array.isArray(attachments) ? attachments : [];
    const newAttachmentKeys = getAttachmentKeys(newAttachments);

    const removedAttachmentKeys = oldAttachmentKeys.filter(
      (oldKey) => !newAttachmentKeys.includes(oldKey),
    );

    post.title = title;
    post.content = content;
    post.category = category;
    post.priority = priority;
    post.visibility = visibility;
    post.courseId = visibility === "course" ? courseId : null;
    post.attachments = newAttachments;

    await post.save();

    if (removedAttachmentKeys.length > 0) {
      await deleteS3ObjectsByKeys(removedAttachmentKeys);
    }

    const becameImportantOrUrgent =
      (priority === "important" || priority === "urgent") &&
      oldPriority !== priority;

    if (becameImportantOrUrgent) {
      await notifyStudentsForPriorityFeedPost({
        createdBy: getUserId(req),
        post,
        title,
        content,
        category,
        priority,
      });
    }

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(200).json({
      success: true,
      message: "Feed post updated successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("UPDATE_FEED_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update feed post.",
    });
  }
};

export const toggleLikeFeedPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = getUserId(req);

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const alreadyLiked = post.likes.some((likeUserId) =>
      isSameId(likeUserId, userId),
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (likeUserId) => !isSameId(likeUserId, userId),
      );
    } else {
      post.likes.push(userId);
    }

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(200).json({
      success: true,
      message: alreadyLiked ? "Post unliked." : "Post liked.",
      liked: !alreadyLiked,
      post: populatedPost,
    });
  } catch (error) {
    console.error("TOGGLE_FEED_LIKE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update like.",
    });
  }
};

export const addFeedComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { message } = req.body;
    const userId = getUserId(req);

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required.",
      });
    }

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    post.comments.push({
      userId,
      message,
    });

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("ADD_FEED_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add comment.",
    });
  }
};

export const addFeedReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { message } = req.body;
    const userId = getUserId(req);

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    comment.replies.push({
      userId,
      message,
    });

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("ADD_FEED_REPLY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add reply.",
    });
  }
};

export const togglePinFeedPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    post.isPinned = !post.isPinned;

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(200).json({
      success: true,
      message: post.isPinned
        ? "Feed post pinned successfully."
        : "Feed post unpinned successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("TOGGLE_PIN_FEED_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update pinned post.",
    });
  }
};

export const deleteFeedPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = getUserId(req);

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const canDelete = isAdmin(req) || isSameId(post.authorId, userId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this post.",
      });
    }

    const attachmentKeys = getAttachmentKeys(post.attachments);

    post.isArchived = true;
    post.attachments = [];

    await post.save();

    if (attachmentKeys.length > 0) {
      await deleteS3ObjectsByKeys(attachmentKeys);
    }

    return res.status(200).json({
      success: true,
      message: "Feed post deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_FEED_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete feed post.",
    });
  }
};

export const deleteFeedComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = getUserId(req);

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const canDelete = isAdmin(req) || isSameId(comment.userId, userId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this comment.",
      });
    }

    comment.deleteOne();

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("DELETE_FEED_COMMENT_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete comment.",
    });
  }
};

export const deleteFeedReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = getUserId(req);

    const post = await FeedPost.findOne({
      _id: postId,
      isArchived: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Feed post not found.",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const reply = comment.replies.id(replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found.",
      });
    }

    const canDelete = isAdmin(req) || isSameId(reply.userId, userId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this reply.",
      });
    }

    reply.deleteOne();

    await post.save();

    const populatedPost = await populateFeedPost(FeedPost.findById(post._id));

    return res.status(200).json({
      success: true,
      message: "Reply deleted successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("DELETE_FEED_REPLY_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete reply.",
    });
  }
};
