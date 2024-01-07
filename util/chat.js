const Chat = require("../model/chat");

const error = require("./error-handling/errorHandler");

module.exports = {
  getChat: async (chatId) => {
    const chat = await Chat.findById(chatId);

    if (!chat) error.errorHandler(404, "No message exists", "chat");
  },
  validChatUser: (chat, userId) => {
    const validUser = chat.user.find(
      (user) => user._id.toString() === userId.toString()
    );

    if (!validUser) error.errorHandler(403, "Not authorized");
  },
};
