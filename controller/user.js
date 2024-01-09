const { validationResult } = require("express-validator");
const { forEach } = require("p-iteration");
const io = require("../util/socket");

// Models
const Post = require("../model/post"),
  User = require("../model/user"),
  Chat = require("../model/chat");

// Helper functions
const error = require("../util/error-handling/errorHandler");
const { userExists, getUser } = require("../util/user");
const { getPost, populatePost } = require("../util/post");
const { getChat, validChatUser } = require("../util/chat");
const { notifyFriend, notifyFriendRequest } = require("../util/notifications");
const { uploadImage, removeImage } = require("../util/images/images");

/***************
 * Create Post *
 ***************/
module.exports.createPost = async (req, res, next) => {
  const content = req.body.content,
    userId = req.body.userId;
  if (!req.file) {
    try {
      // Get current user
      const user = await userExists("id", userId);

      // Check if user is undefined
      if (!user) error.errorHandler(res, "not authorize", "user");

      // Check if both inputs are valid
      if (!content) error.errorHandler(res, "no content posted", "input");

      // Continue if there are no errors

      // Create new post
      const post = new Post({
        content,
        creator: user._id.toString(),
      });

      // Add new post to post array in user
      user.posts.push(post);
      await user.save();

      // Save post to database
      const createdPost = await post.save();

      io.getIO().emit("posts", { action: "create post" });

      // Return response back to client
      res
        .status(201)
        .json({ message: "post created successfully", createdPost });
    } catch (err) {
      error.error(err, next);
    }
  } else {
    try {
      const uploadedImage = await uploadImage(req.file.path);

      // Get current user
      const user = await userExists("id", userId);

      // Check if user is undefined
      if (!user) error.errorHandler(res, "not authorizedd", "user");

      // Check if both inputs are invalid
      if (!uploadedImage.imageUrl && !content)
        error.errorHandler(res, "no content posted", "input");

      // Continue if there are no errors
      let imageUrl, imageId;
      if (uploadedImage) {
        imageUrl = uploadedImage.imageUrl;
        imageId = uploadedImage.imageId;
      }

      // Create new post
      const post = new Post({
        content,
        postImage: {
          imageUrl,
          imageId,
        },
        creator: user._id.toString(),
      });

      // Add new post to user posts array
      user.posts.push(post);
      await user.save();

      // Save post to database
      const createdPost = await post.save();

      io.getIO().emit("posts", { action: "create post" });

      // Return response back to client
      res
        .status(201)
        .json({ message: "post created successfully", createdPost });
    } catch (err) {
      error.error(err, next);
    }
  }
};

/***************
 * Update Post *
 ***************/
module.exports.updatePost = async (req, res, next) => {
  const userId = req.body.userId,
    content = req.body.content,
    postId = req.body.postId;

  try {
    // Upload image if any
    let uploadedImage;
    if (req.file) {
      uploadedImage = await uploadImage(req.file.path);
    }

    const post = await getPost(postId);

    // Check if both content is undefined
    if (!content) error.errorHandler(res, "post cannot be empty", "input");

    // Check if post creator id matches current user id
    if (post.creator.toString() !== userId.toString())
      error.errorHandler(res, "not authorized", "user");

    // Continue if there are no errors
    post.content = content;

    if (uploadedImage) {
      post.postImage.imageUrl = uploadedImage.imageUrl;
      post.postImage.imageId = uploadedImage.imageId;
    }

    post.edited = Date.now();

    // Save updated post to database
    await post.save();

    // Send response to client
    res.status(201).json({ message: "post updated successfully", post });
  } catch (err) {
    error.error(err, next);
  }
};

/***************
 * Delete Post *
 ***************/
module.exports.deletePost = async (req, res, next) => {
  const userId = req.body.userId,
    postId = req.body.postId;

  try {
    // Check if user is authenticated
    if (!req.isAuth) error.errorHandler(res, "not authorized", "user");

    const user = await userExists("id", userId);
    const post = await getPost(postId);

    // Check if user exists
    if (!user) error.errorHandler(res, "user not found", "user");

    // Check if post exists
    if (!post) error.errorHandler(res, "post not found", "post");

    // Check if user has permission to remove post
    if (post.creator.toString() !== userId.toString())
      error.errorHandler(res, "not authorized", "user");

    // Check if post has image
    const postImage = post.postImage;

    if (postImage) {
      removeImage(postImage.imageId);
    }

    // Loop through post comments for all comments with images and remove them
    if (post.comments.length > 0) {
      post.comments.forEach((comment) => {
        if (comment.postImage) removeImage(comment.postImage.imageId);
        if (comment.replies.length > 0) {
          comment.replies.forEach((reply) => {
            if (reply.postImage) removeImage(reply.postImage.imageId);
          });
        }
      });
    }

    // Remove post from posts array
    user.posts.pull(postId);
    await user.save();

    // Remove post from posts array
    await Post.findByIdAndDelete(postId);

    io.getIO().emit("posts", {
      action: "delete post",
      postId: post._id.toString(),
    });

    // Send response to client
    res.status(201).json({ message: "post deleted successfully", post });
  } catch (err) {
    error.error(err, next);
  }
};

/*************
 * Get Posts *
 *************/
module.exports.getPosts = async (req, res, next) => {
  const userId = req.body.userId;
  try {
    const user = await User.findById(userId).populate("posts");

    // Check if user is defined
    if (!user) error.errorHandler(res, "user not found", "user");

    // Continue if there are no errors

    const posts = user.posts;

    // send response to client
    res.status(200).json({ message: "posts fetched successfully", posts });
  } catch (err) {
    error.error(err, next);
  }
};

/****************
 * Send Request *
 ****************/
module.exports.sendRequest = async (req, res, next) => {
  const friendId = req.body.friendId,
    userId = req.body.userId;

  try {
    // Get receiving user info
    const receivingUser = await getUser(friendId),
      currentUser = await userExists("id", userId);

    // Check if currentUser exist
    if (!currentUser) error.errorHandler(res, "not authorized", "user");

    // Check if currentUser doesn't already have a pending request
    if (
      currentUser.requests.content.find(
        (req) => req.user.toString() === friendId
      )
    ) {
      error.errorHandler(
        res,
        "you already have a pending request from this user",
        "friend"
      );
    }

    // Check if requestingUser doesn't already have same pending request
    const existingRequest = receivingUser.requests.content.find(
      (item) => item.user.toString() === userId
    );

    if (existingRequest) {
      error.errorHandler(res, "you already have a pending request", "user");
    }

    // Check if users aren't friends already
    const isFriends = currentUser.friends.find(
      (friend) => friend.toString() === friendId
    );

    if (isFriends) {
      error.errorHandler(res, "already friends with this user", "user");
    }

    // Continue if no errors

    // Add notification to users about the request
    await notifyFriendRequest(currentUser, receivingUser, "friend request");

    const contentData = {
      user: userId,
      date: Date.now(),
    };

    // Add currentUser to receivingUser requests array
    receivingUser.requests.content.push(contentData);
    await receivingUser.save();

    io.getIO().emit("notification");
    io.getIO().emit("friend");

    // Send response to client
    res.status(200).json({
      message: "friend request sent",
      friend: receivingUser,
    });
  } catch (err) {
    error.error(err, next);
  }
};

/**************************
 * Decline Friend Request *
 **************************/
module.exports.declineRequest = async (req, res, next) => {
  const requestId = req.body.requestId,
    userId = req.body.userId;

  try {
    // Check if there are no errors
    const user = await userExists("id", userId);

    if (!user) error.errorHandler(res, "not authorized", "user");

    // Check if requesting user exists
    const existingRequest = user.requests.content.find(
      (req) => req._id.toString() === requestId
    );

    if (!existingRequest)
      error.errorHandler(res, "friend request not found", "user");

    // Remove count from user
    if (user.requests.count !== 0) {
      user.requests.count = user.requests.count - 1;
    }

    user.requests.content.pull(requestId);

    await user.save();

    io.getIO().emit("notification");

    res.status(200).json({ message: "friend request declined" });
  } catch (err) {
    error.error(err, next);
  }
};

/*************************
 * Accept Friend Request *
 *************************/
module.exports.acceptRequest = async (req, res, next) => {
  const friendId = req.body.friendId,
    requestId = req.body.requestId,
    userId = req.body.userId;

  try {
    // Get current user profile
    const currentUser = await userExists("id", userId);

    // check if currentUser is undefined
    if (!currentUser) error.errorHandler(res, "not authorized", "user");

    // Get requestingUser profile
    const requestingUser = await getUser(friendId);

    // Add both users to friends array
    currentUser.friends.push(requestingUser);
    requestingUser.friends.push(currentUser);

    // Remove notification from currentUser
    currentUser.requests.count = currentUser.requests.count - 1;
    currentUser.requests.content.pull(requestId);

    // Add notification to both users
    await notifyFriend(currentUser, requestingUser, "friend request");

    //Save changes
    await currentUser.save();
    await requestingUser.save();

    io.getIO().emit("notification");
    io.getIO().emit("handle friend", {
      action: "accept request",
      id: [userId, friendId],
    });

    // Send response to client
    res.status(200).json({ message: "friend request accepted" });
  } catch (err) {
    error.error(err, next);
  }
};

/*************************
 * Cancel Friend Request *
 *************************/
module.exports.cancelFriendRequest = async (req, res, next) => {
  const friendId = req.body.friendId,
    userId = req.body.userId;

  try {
    const friend = await User.findById(
      friendId,
      "requests firstName lastName fullName profileImage"
    );

    // Check if friend is undefined
    if (!friend) error.errorHandler(res, "user not found", "friend");

    // Remove pending request on friend request content
    friend.requests.content = friend.requests.content.filter(
      (req) => req.user.toString() !== userId.toString()
    );

    // Decrement friend request count
    if (friend.requests.count > 0) {
      friend.requests.count = friend.requests.count - 1;
    }

    await friend.save();

    io.getIO().emit("notification");

    // Send response to client
    res.status(200).json({ message: "friend request cancelled" });
  } catch (err) {
    error.error(err, next);
  }
};

/*****************
 * Remove Friend *
 *****************/
module.exports.removeFriend = async (req, res, next) => {
  const userId = req.body.userId,
    friendId = req.body.friendId;

  try {
    const friend = await getUser(friendId);

    // Get currentUser
    const currentUser = await userExists("id", userId);

    // Check if currentUser is undefined
    if (!currentUser) error.errorHandler(res, "friend not found", "friend");

    // Check if friendId does not exist in currentUser's friends list
    if (!currentUser.friends.includes(friendId)) {
      error.errorHandler(res, "friend not found", "friend");
    }

    // Continue if there are no errors

    // Remove friend from currentUser
    currentUser.friends.pull(friendId);

    // Remove currentUser from friend
    friend.friends.pull(userId);

    // Save changes
    await currentUser.save();
    await friend.save();

    io.getIO().emit("notification");
    io.getIO().emit("handle friend", {
      action: "accept request",
      id: [userId, friendId],
    });

    // Send response to client
    res.status(200).json({ message: "friend removed successfully" });
  } catch (err) {
    error.error(err, next);
  }
};
