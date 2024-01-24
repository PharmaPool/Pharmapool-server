const express = require("express");
const router = express.Router();
const userController = require("../controller/user");
const multer = require("multer");
const { body } = require("express-validator");

const upload = multer({ dest: "../uploads" });

// Posts Routes
router.post("/post", upload.single("file"), userController.createPost);
router.patch("/post", userController.updatePost);
router.delete("/post", userController.deletePost);
router.get("/posts", userController.getPosts);

// Request Routes
router.post("/friend-request", userController.sendRequest);
router.get("/friend-request/:_id", userController.getFriendRequests);
router.delete("/friend-request", userController.clearFriendRequestCount);
router.post("/accept-friend", userController.acceptRequest);
router.post("/decline-friend", userController.declineRequest);
router.post("/cancel-friend", userController.cancelFriendRequest);
router.delete("/remove-friend", userController.removeFriend);

// Message Routes
router.post(
  "/message",
  [body("message", "Message cant be empty").not().isEmpty()],
  userController.sendMessage
);
router.delete("/message", userController.clearMessageCount);
router.post("/message/friend", userController.addFriendToMessage);
router.delete("/message/friend", userController.removeFriendFromMessage);
router.post("/message/leave", userController.leaveChat);
router.post(
  "/message/create",
  [
    body("message").not().isEmpty().withMessage("Please enter a message"),
    body("recipients")
      .not()
      .isEmpty()
      .withMessage("please select a recipient to send message to"),
  ],
  userController.createMessage
);

router.get("/chat/:_id", userController.getMessages);
router.post(
  "/chat/:_id",
  [body("message", "message can't be empty").not().isEmpty()],
  userController.messaging
);

router.post("/search", userController.searchUser)
router.post("/search/:_id", userController.searchFriend)

module.exports = router;
