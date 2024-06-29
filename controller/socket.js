const { validationResult } = require("express-validator");
const { forEach } = require("p-iteration");
const io = require("../util/socket");

// Models
const Post = require("../model/post"),
  User = require("../model/user"),
  Chat = require("../model/chat"),
  ChatRoom = require("../model/chatroom");

// Helper functions
const error = require("../util/error-handling/errorHandler");
const { userExists, getUser } = require("../util/user");
const { getPost, populatePost } = require("../util/post");
const { getChat, validChatUser, validAdmin } = require("../util/chat");
const { notifyFriend, notifyFriendRequest } = require("../util/notifications");
const { uploadImage, removeImage } = require("../util/images/images");

module.exports = (socket) => {
  socket.on("chatss", async (result) => {
    const friendId = result.friendId,
      message = result.message,
      userId = result.userId;

    try {
      // Get and validate user
      const user = await getUser(userId);

      // Get and validate friend
      const friend = await getUser(friendId);

      // Check input validation
      // const validatorErrors = validationResult(req);

      // error.validationError(validatorErrors);

      // Continue if there are no errors

      // Check if you already have a chat going on with just the user
      const existingChat = await Chat.findOne({
        $and: [
          { users: { $elemMatch: { userId: friendId } } },
          { users: { $elemMatch: { userId: userId } } },
        ],
      });

      if (existingChat) {
        // Add unto existingChat with friend

        // Push new message unto messages array on chat
        existingChat.messages.push({
          user: userId,
          message,
          date: Date.now(),
        });
        // Add count to messages for recipient user
        friend.messages.count += 1;

        await friend.messages.singlechatcontent.pull(existingChat._id);
        await user.messages.singlechatcontent.pull(existingChat._id);

        await friend.messages.singlechatcontent.unshift(existingChat);
        await user.messages.singlechatcontent.unshift(existingChat);

        await friend.save();
        await user.save();

        // Save changes
        await existingChat.save();

        const chatMade = await Chat.findById(existingChat._id)
          .populate("users", "firstName lastName fullName profileImage")
          .populate(
            "messages.user",
            "firstName lastName fullName profileImage"
          );

        io.getIO().emit("chat", { action: "message sent", chatMade });
      } else {
        // Create new chat with friend

        // Create new chat object
        const chat = new Chat({
          users: [{ userId: friendId }, { userId: userId }],
          messages: [{ user: userId, message }],
        });

        // Add created messages to both currentUser and friend messages array
        user.messages.singlechatcontent.unshift(chat);
        friend.messages.singlechatcontent.unshift(chat);

        friend.messages.count += 1;

        // Save update
        await chat.save();
        await user.save();
        await friend.save();

        const chatMade = await Chat.findById(chat._id)
          .populate("users", "firstName lastName fullName profileImage")
          .populate(
            "messages.user",
            "firstName lastName fullName profileImage"
          );

        io.getIO().emit("chat", { action: "message sent", chatMade });
      }
    } catch (err) {
      io.getIO().emit("chat_error", { action: "chat error", err });
    }
  });
  socket.on("chatts", (result) => console.log(result));
};
