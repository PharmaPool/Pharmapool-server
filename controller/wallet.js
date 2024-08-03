const ChatRoom = require("../model/chatroom");
const Chat = require("../model/chat");
const Wallet = require("../model/wallet");
const dotenv = require("dotenv");
dotenv.config();

const Paystack = require("paystack")(process.env.PAYSTACK_KEY);
const error = require("../util/error-handling/errorHandler");

module.exports.createChatWallet = async (req, res, next) => {
  const chatId = req.body.chatId,
    business_name = req.body.business_name;

  try {
    // validate chat
    const chat = await ChatRoom.findById(chatId);
    if (!chat) {
      error.errorHandler(res, "chat not found", "chat");
      return;
    }

    // create subaccount
    const wallet = await Paystack.subaccount.create({
      business_name,
      settlement_bank: process.env.SETTLEMENT_BANK,
      account_number: process.env.ACCOUNT_NUMBER,
      percentage_charge: process.env.PERCENTAGE_CHARGE,
    });

    // create wallet

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "wallet created successfully", wallet });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.acceptWalletPayment = async (req, res, next) => {};

module.exports.verifyWalletPayment = async (req, res, next) => {};

module.exports.getWalletDetails = async (req, res, next) => {};
