import express from "express";

import {
  addFeedComment,
  addFeedReply,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  deleteFeedReply,
  getFeedPostById,
  getFeedPosts,
  getUnreadFeedCount,
  markFeedAsRead,
  toggleLikeFeedPost,
  togglePinFeedPost,
  updateFeedPost,
} from "../controllers/feed.controller.js";

import {
  uploadFeedImage,
  uploadFeedImageMiddleware,
} from "../controllers/feedUpload.controller.js";

import { authorizeRoles, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getFeedPosts).post(createFeedPost);

router.get("/unread-count", getUnreadFeedCount);

router.patch("/mark-read", markFeedAsRead);

router.post(
  "/admin/upload-image",
  authorizeRoles("admin"),
  uploadFeedImageMiddleware,
  uploadFeedImage,
);

router
  .route("/:postId")
  .get(getFeedPostById)
  .patch(authorizeRoles("admin"), updateFeedPost)
  .delete(deleteFeedPost);

router.patch("/:postId/like", toggleLikeFeedPost);

router.patch("/:postId/pin", authorizeRoles("admin"), togglePinFeedPost);

router.post("/:postId/comments", addFeedComment);

router.delete("/:postId/comments/:commentId", deleteFeedComment);

router.post("/:postId/comments/:commentId/replies", addFeedReply);

router.delete("/:postId/comments/:commentId/replies/:replyId", deleteFeedReply);

export default router;
