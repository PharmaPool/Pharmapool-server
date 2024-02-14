const { validationResult } = require("express-validator");
const io = require("../util/socket");
const { filter } = require("p-iteration");

// Models
const Post = require("../model/post");
const User = require("../model/user");

// Helper function
const error = require("../util/error-handling/errorHandler");
const { uploadImage, removeImage } = require("../util/images/images");
const { notifyLikes, notifyComment } = require("../util/notifications");
const {
  populatePost,
  getPost,
  getCommentIndex,
  getExistingComment,
  getReplyIndex,
} = require("../util/post");

/*******************************
 * Get posts from current user *
 *******************************/
module.exports.getPosts = async (req, res, next) => {
  try {
    let posts;

    posts = (
      await Post.find()
        .sort({ updatedAt: -1 })
        .populate("creator")
        .populate("likes", "firstName lastName fullName profileImage")
    )
      .populate({
        path: "friends",
        populate: populatePost,
      })
      .populate(populatePost);
    posts.sort((a, b) => b.updatedAt - a.updatedAt);

    res.status(200).json({ posts });
  } catch (err) {
    error.error(err, next);
  }
};

/*******************
 * Comment on Post *
 *******************/
module.exports.postComment = async (req, res, next) => {
  const postId = req.params.postId,
    content = req.body.content,
    image = req.file,
    userId = req.body.userId;

  try {
    const post = await getPost(postId);
    const user = await User.findById(userId);

    // Check for user
    if (!user) error.errorHandler(404, "user not found");

    // Check both content and image
    if (!content && !image)
      error.errorHandler(res, "comment cannot be empty", "comment");

    let imageUrl, imageId;
    if (image) {
      let uploadedImage = await uploadImage(req.file.path);
      imageUrl = uploadedImage.imageUrl;
      imageId = uploadedImage.imageId;
    }

    // Create a comment object
    const comment = {
      content,
      postImage: {
        imageUrl,
        imageId,
      },
      user: userId,
    };

    // Push comment unto comments array
    post.comments.push(comment);

    // Save comment to post
    await post.save();

    // Get updated post
    const updatedPost = await Post.findById(
      postId,
      "comments creator"
    ).populate("comment.user", "firstName lastName fullName profileImage");

    // Don't send out notification if current userId matches post creator id
    if (userId !== post.creator._id.toString()) {
      await notifyComment(
        post,
        updatedPost,
        postId,
        "post",
        "add",
        post,
        user.profileImage.imageUrl
      );
    }

    io.getIO().emit("post", { action: "comment" });

    // Send response to client
    res.status(200).json({ message: "comment successfully added" });
  } catch (err) {
    error.error(err, next);
  }
};

/**************************
 * Delete Comment on Post *
 **************************/
module.exports.deleteComment = async (req, res, next) => {
  const commentId = req.body.commentId,
    postId = req.params.postId;
  const userId = req.userId;

  try {
    // Get main post that has the comment
    const post = await getPost(postId, "comments");

    // Check if comment still exists in the post
    const existingComment = getExistingComment(post, commentId);

    // Check comment index
    const commentIndex = getCommentIndex(post, commentId);

    // Check if current userId matches with comment user._id
    if (existingComment.user.toString() !== userId.toString()) {
      error.errorHandler(res, "not authorized", "user");
    }

    let postCommentImage = post.comments[commentIndex].postImage;
    if (postCommentImage) removeImage(res, postCommentImage.imageId);

    // Get any associated images for all replies
    const postReplyImages = post.comments[commentIndex].replies.map(
      (reply) => reply.postImage
    );
    if (postReplyImages.length > 0) {
      postReplyImages.forEach((imageId) => removeImage(res, imageId));
    }

    // Pull comment from post comments array
    post.comments.pull(commentId);

    // Save updated post
    await post.save();

    io.getIO().emit("posts", { action: "remove comment" });

    // Send response to client
    res.status(200).json({ message: "comment has been deleted" });
  } catch (err) {
    error.error(err, next);
  }
};

/************************
 * Edit Comment on Post *
 ************************/
module.exports.editComment = async (req, res, next) => {
  const postId = req.params.postId,
    content = req.body.content,
    commentId = req.body.commentId,
    userId = req.body.userId;

  try {
    // Get Post
    const post = await getPost(postId, "comments");

    // Check if both content and postImage is empty
    if (!content) {
      error.errorHandler(res, "fields cannot be empty", "comment");
    }

    // Filter out comments array from commentId
    const commentPostIndex = post.comments.findIndex(
      (post) => post._id.toString() === commentId.toString()
    );

    // Check if comment exists
    if (commentPostIndex < 0)
      error.errorHandler(res, "comment no found", "comment");

    // Verify if userId from comment matches current user's id
    const commentUserId = post.comments[commentPostIndex].user.toString();
    if (commentUserId !== userId.toString())
      error.errorHandler(res, "not authorized", "user");

    // Continue if there are no errors

    //  Update post to new content
    post.comments[commentPostIndex].content = content;

    // Set edited property on comment
    post.comments[commentPostIndex].edited = Date.now();

    // Save changes to post
    await post.save();

    io.getIO().emit("post", { action: "edit comment" });

    res.status(202).json({ message: "comment successfully updated" });
  } catch (err) {
    error.error(err, next);
  }
};

/**********************
 * Add Like to a Post *
 **********************/
module.exports.addLikeToPost = async (req, res, next) => {
  const postId = req.params.postId,
    userId = req.body.userId;

  try {
    const post = await Post.findById(postId)
      .populate("likes", "firstName lastName fullName profileImage")
      .populate("comments");

    const user = await User.findById(userId, "profileImage");

    // Check if user exists
    const alreadyLiked = post.likes.filter(
      (post) => post._id.toString() === userId.toString()
    );

    if (alreadyLiked.length !== 0) {
      return res.status(200).json({ status: 422 });
    }

    // Continue if there are no errors

    // Unshift current user into likes array of post
    await post.likes.push(req.userId);
    await post.save();

    // Get the updated post -- so population for new pushed user can work
    const updatedPost = await Post.findById(postId)
      .populate("likes", "firstName lastName fullName profileImage")
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate(
        "comments.replies.user",
        "firstName lastName fullName profileImage"
      )
      .populate("creator", "firstName lastName fullName profileImage");

    // Don't send any notification if current userId matches the post creatorId
    if (userId !== post.creator._id.toString()) {
      await notifyLikes(
        post,
        updatedPost,
        postId,
        "post",
        "add",
        post,
        user.profileImage.imageUrl
      );
    }

    io.getIO().emit("posts", { action: "post like", post: updatedPost });
    io.getIO().emit("notification");

    // Send response to client
    res.status(200).json({ message: "you have liked this post" });
  } catch (err) {
    error.error(err);
  }
};

/*************************
 * Remove Like from Post *
 *************************/
module.exports.removeLikeFromPost = async (req, res, next) => {
  const postId = req.params.postId,
    userId = req.body.userId;

  try {
    const post = getPost(postId);

    const user = await User.findById(userId, "profileImage");

    // Check if user is undefined
    if (!user) error.errorHandler(res, "user not found", "user");

    // Check if user has not liked the post
    if (!post.likes.includes(userId))
      error.errorHandler(res, "no likes to remove", "user");

    // Continue if there are no errors

    // Pull current userId from likes array
    post.likes.pull(userId);

    // Save post to database
    await post.save();

    // Remove notification from post owner

    // Get updated post
    const updatedPost = await Post.findById(postId)
      .populate("likes", "firstName lastName fullName profileImage")
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate("comments.likes", "firstName lastName fullName profileImage")
      .populate(
        "comments.replies.user",
        "firstName lastName fullName profileImage"
      )
      .populate("creator", "firstName lastName fullName profileImage");

    // Don't send any notification if current userId matches the post creatorId
    if (userId !== post.creator._id.toString()) {
      await notifyLikes(
        post,
        updatedPost,
        postId,
        "post",
        "remove",
        post,
        user.profileImage.imageUrl
      );
    }

    io.getIO().emit("post", { action: "remove", post: updatedPost });
    io.getIO().emit("notification");

    // Send response to client
    res.status(200).json({ message: "like removed", post: updatedPost });
  } catch (err) {
    error.error(err);
  }
};

/*************************
 * Add Like to a Comment *
 *************************/
module.exports.addCommentLike = async (req, res, next) => {
  const postId = req.params.postId,
    commentId = req.body.commentId,
    userId = req.body.userId;

  try {
    const post = await Post.findById(postId)
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate("comments.likes", "firstName lastName fullName profileImage");

    // Get comment index
    const commentIndex = getCommentIndex(post, commentId);

    const user = await User.findById(userId, "profileImage");

    // Check if user exists
    if (!user) error.errorHandler(res, "user not found", "user");

    // Check if current user already liked the comment
    const alreadyLiked = post.comments[commentId].likes.filter(
      (like) => like._id.toString() === userId.toString()
    );

    if (alreadyLiked.length !== 0) {
      return res.status(200).json({ status: 422 });
    }

    // Continue if there are no errors

    // Unshift current into comments like array
    await post.comments[commentIndex].likes.unshift(req.body.userId);

    await post.save();

    // Get post comments
    const updatedPost = await Post.findById(postId)
      .populate("creator", "firstName lastName fullName profileImage")
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate("comments.likes", "firstName lastName fullName profileImage")
      .populate(
        "comments.replies.likes",
        "firsName lastName fullName profileImage"
      )
      .populate(
        "comments.replies.user",
        "firstName lastName fullName profileImage"
      );

    // Don't send notification to current userId if it matches the post creator
    if (userId !== post.creator._id.toString()) {
      await notifyLikes(
        post.comments[commentIndex],
        updatedPost.comments[commentIndex],
        commentId,
        "comment",
        "add",
        post,
        user.profileImage.imageUrl
      );
    }

    io.getIO().emit("post", { action: "add comment like", post: updatedPost });
    io.getIO().emit("notification");

    // Send response to client
    res
      .status(200)
      .json({ message: "you have liked this comment", post: updatedPost });
  } catch (err) {
    error.error(err, next);
  }
};

/********************************
 * Remove a Like from a Comment *
 ********************************/
module.exports.removeCommentLike = async (req, res, next) => {
  const postId = req.params.postId, commentId = req.body.commentId, userId = req.body.userId

  try {
    const post = await Post.findById(postId)

    
  } catch (err) {
    error.error(err, next)
  }
}