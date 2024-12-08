const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatroomSchema = new Schema({
  title: { type: String, required: true },
  profileImage: {
    type: String,
    default:
      "https://res.cloudinary.com/dex0mkckw/image/upload/v1713479804/10562295368_si7010.png",
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  ],
  messages: [
    {
      user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      message: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now(),
      },
    },
  ],
  wallet: { type: Schema.Types.ObjectId, ref: "Wallet" },
});

module.exports = mongoose.model("ChatRoom", chatroomSchema);
