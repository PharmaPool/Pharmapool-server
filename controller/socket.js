const { validationResult } = require("express-validator");
const { forEach } = require("p-iteration");
const io = require("../util/socket");

// Models
const User = require("../model/user"),
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
  socket.on("chat", async (result) => {
    const friendId = result.friendId,
      message = result.message,
      userId = result.userId;

    try {
      // Get and validate user
      const user = await getUser(userId);
      const friend = await getUser(friendId);

      if (!user) {
        error.errorHandler(res, "user not found", "user");
        return;
      }

      if (!friend) {
        error.errorHandler(res, "friend not found", "friend");
        return;
      }

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
        await existingChat.messages.push({
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

  socket.on("chatroom", async (result) => {
    const userId = result.userId,
      chatId = result._id,
      message = result.message;

    try {
      // Get and validate chat
      const chat = await ChatRoom.findById(chatId)
        .populate("users", "firstName lastName fullName profileImage")
        .populate("messages.user", "firstName lastName fullName profileImage");
      if (!chat) {
        error.errorHandler(err, "chatroom not found", "chat");
        return;
      }

      // Check if user is valid
      if (!chat.users.find((user) => user._id.toString() === userId)) {
        error.errorHandler(res, "not authorized", "user");
        return;
      }

      // Check input validation
      // const validationError = validationResult(req);

      // error.validationError(validationError);

      // Continue if there are no errors

      // Create message object
      const newMessage = {
        user: userId,
        message,
        date: Date.now(),
      };

      // Send message notification to all users in current chat except the current user
      const chatUsers = chat.users;

      forEach(chatUsers, async (item) => {
        const user = await User.findById(item._id);

        if (user._id.toString() && item.userId !== userId.toString()) {
          // Send message notification to each valid user

          //  Check if user doesn't already have current chatId in their messages content array
          const existingChatNotification =
            user.messages.chatroomcontent.includes(chatId);

          if (existingChatNotification) {
            // Pull existing chat from user
            await user.messages.chatroomcontent.pull(chatId);

            // Unshift new chat content to user
            await user.messages.chatroomcontent.unshift(chatId);
          } else {
            // Unshift new chat content to user
            await user.messages.chatroomcontent.unshift(chatId);
          }

          // Add to messages count on user
          user.messages.count = user.messages.count + 1;

          // Save user changes
          await user.save();
        }
      });

      // Push new message unto messages array in chat object
      chat.messages.push(newMessage);

      // Save chat updates
      await chat.save();

      const chatMade = await ChatRoom.findById(chat._id)
        .populate("users", "firstName lastName fullName profileImage")
        .populate("messages.user", "firstName lastName fullName profileImage");

      // send response to client
      io.getIO().emit("chatroom", { action: "message sent", chatMade });
    } catch (err) {
      io.getIO().emit("chat_error", { action: "chat error", err });
    }
  });

  socket.on("search", async (result) => {
    const name = result.name;

    try {
      const user = await User.find(
        {
          $or: [
            { firstName: { $regex: name, $options: "i" } },
            { lastName: { $regex: name, $options: "i" } },
          ],
        },
        "firstName lastName fullName profileImage"
      );

      if (!user) {
        error.errorHandler(err, "user not found", "user");
        return;
      }

      io.getIO().emit("search", { action: "search", user });
    } catch (err) {
      io.getIO().emit("search_error", { action: "search error", err });
    }
  });
};
