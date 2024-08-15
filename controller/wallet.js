const ChatRoom = require("../model/chatroom");
const Chat = require("../model/chat");
const Wallet = require("../model/wallet");
const dotenv = require("dotenv");
dotenv.config();

const Paystack = require("paystack")(process.env.PAYSTACK_KEY);
const error = require("../util/error-handling/errorHandler");
const { getUser } = require("../util/user");
const https = require("https");

// create chat wallet
module.exports.createChatWallet = async (req, res, next) => {
  const userId = req._id,
    chatId = req.body.chatId,
    amount = req.body.amount;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      error.errorHandler(res, "chat not found", "chat");
      return;
    }

    // create subaccount
    const business_name = `${user.details.email} business`;
    const subaccount = await Paystack.subaccount.create({
      business_name,
      settlement_bank: process.env.SETTLEMENT_BANK,
      account_number: process.env.ACCOUNT_NUMBER,
      percentage_charge: process.env.PERCENTAGE_CHARGE,
    });

    // create wallet
    const wallet = new Wallet({
      walletAddress: subaccount.data.subaccount_code,
      walletId: subaccount.data.id,
      amount,
    });
    await wallet.save();

    chat.wallet = wallet._id;
    await chat.save();

    const updatedChat = await Chat.findById(chatId).populate("wallet");

    // send response to client
    res.status(200).json({
      success: true,
      message: "wallet created successfully",
      chat: updatedChat,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// create chatroom wallet
module.exports.createChatRoomWallet = async (req, res, next) => {
  const chatroomId = req.params.chatroomId,
    userId = req._id,
    amount = Number(req.body.amount);

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chat
    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      error.errorHandler(res, "chat not found", "chat");
      return;
    }

    // create subaccount
    const subaccount = await Paystack.subaccount.create({
      business_name: `${chatroom.title} business`,
      settlement_bank: process.env.SETTLEMENT_BANK,
      account_number: process.env.ACCOUNT_NUMBER,
      percentage_charge: process.env.PERCENTAGE_CHARGE,
    });

    // create wallet
    const wallet = new Wallet({
      walletAddress: subaccount.data.subaccount_code,
      walletId: subaccount.data.id,
      amount,
    });
    await wallet.save();

    chatroom.wallet = wallet._id;
    await chatroom.save();

    const updatedChatroom = await ChatRoom.findById(chatroomId)
      .populate("wallet")
      .populate("users", "firstName lastName fullName profileImage");

    const updatedWallet = await Wallet.findById(wallet._id).populate({
      path: "referenceCodes",
      populate: {
        path: "user",
        select: "firstName lastName fullName profileImage",
      },
    });

    // send response to client
    res.status(200).json({
      success: true,
      message: "wallet created successfully",
      chatroom: updatedChatroom,
      wallet: updatedWallet,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// accept wallet payment
module.exports.acceptWalletPayment = async (req, res, next) => {
  const amount = req.body.amount,
    subaccount = req.params.walletAddress,
    userId = req._id;
  let data = "",
    result;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // get and validate wallet
    const wallet = await Wallet.findOne({ walletAddress: subaccount }).populate(
      {
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      }
    );
    if (!wallet) {
      error.errorHandler(res, "wallet not found", "wallet");
      return;
    }

    const params = JSON.stringify({
      email: user.details.email,
      amount: Number(amount) * 100,
      subaccount,
      transaction_charge: process.env.PERCENTAGE_CHARGE,
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = await https
      .request(options, (response) => {
        response.on("data", (chunk) => {
          data += chunk;
          result = JSON.parse(data);
        });

        response.on("end", async () => {
          let reference = result.data.reference;
          await wallet.referenceCodes.push({
            user: userId,
            reference,
          });
          wallet.balance += amount;
          await wallet.save();

          // update user
          user.access_code = result.data.access_code;
          await user.save();

          res.status(200).json({ result, wallet });
        });
      })
      .on("error", (err) => {
        error.error(err, next);
      });

    req.write(params);
    req.end();
  } catch (err) {
    error.error(err, next);
  }
};

// verify wallet payment
module.exports.verifyWalletPayment = async (req, res, next) => {
  const walletAddress = req.params.walletAddress,
    reference = req.body.reference,
    chatroomId = req.body.chatroomId,
    userId = req._id;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chatroom
    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      error.errorHandler(res, "invalid chatroom", "chatroom");
      return;
    }

    // get wallet
    const wallet = await Wallet.findOne({ walletAddress }).populate({
      path: "referenceCodes",
      populate: {
        path: "user",
        select: "firstName lastName fullName profileImage",
      },
    });
    if (!wallet) {
      error.errorHandler(res, "invalid wallet", "wallet");
      return;
    }

    // verify transaction
    Paystack.transaction
      .verify(reference)
      .then(async (transaction) => {
        if (transaction.data.status === "success") {
          await wallet.referenceCodes.map((partner) => {
            if (partner.user._id.toString() === userId) {
              partner.paymentStatus = true;
            }
          });
          await wallet.save();
          res.status(200).json({ wallet, chatroom });
        }
      })
      .catch((err) => console.log(err));
  } catch (err) {
    error.error(err, next);
  }
};

// get chat wallet details
module.exports.getChatWalletDetails = async (req, res, next) => {
  const chatId = req.params.chatId,
    userId = req._id;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chat
    const chat = await Chat.findById(chatId).populate("wallet");
    if (!chat) {
      error.errorHandler(res, "invalid chat", "chat");
      return;
    }

    // get and validate wallet
    const wallet = await Paystack.subaccount.get(chat.wallet.walletId);

    res
      .status(200)
      .json({ success: true, message: "wallet fetched successfully", wallet });
  } catch (err) {
    error.error(err, next);
  }
};

// get chatroom wallet details
module.exports.getChatRoomWalletDetails = async (req, res, next) => {
  const chatroomId = req.params.chatroomId,
    userId = req._id;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chatroom
    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      error.errorHandler(res, "invalid chat", "chat");
      return;
    }

    // get wallet
    const wallet = await Wallet.findById(chatroom.wallet).populate({
      path: "referenceCodes",
      populate: {
        path: "user",
        select: "firstName lastName fullName profileImage",
      },
    });
    if (!wallet) {
      error.errorHandler(res, "invalid wallet", "wallet");
      return;
    }

    res.status(200).json({
      success: true,
      message: "wallet fetched successfully",
      wallet,
      chatroom,
    });
  } catch (err) {
    error.error(err, next);
  }
};
