const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
  walletAddress: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now() },
  referenceCode: { type: String, required: true },
  chatId: { type: Schema.Types.ObjectId, ref: "Chat" },
  chatroomId: { type: Schema.Types.ObjectId, ref: "ChatRoom" },
});

module.exports = mongoose.model("Wallet", walletSchema);
