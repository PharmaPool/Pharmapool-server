const ChatRoom = require("../model/chatroom");
const Chat = require("../model/chat");
const Wallet = require("../model/wallet");
const Donor = require("../model/donor");
const dotenv = require("dotenv");
dotenv.config();

const Paystack = require("paystack")(process.env.PAYSTACK_KEY);
const error = require("../util/error-handling/errorHandler");
const { getUser } = require("../util/user");
const https = require("https");

// create chat wallet
module.exports.createChatWallet = async (req, res, next) => {
  const userId = req._id,
    chatId = req.params.chatId,
    amount = Number(req.body.amount);

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
    const business_name = `${user.firstName} business`;
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
    wallet.supplier.user = userId;
    await wallet.save();

    chat.wallet = wallet._id;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
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
      chat: updatedChat,
      wallet: updatedWallet,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// create chatroom wallet
module.exports.createChatRoomWallet = async (req, res, next) => {
  const chatroomId = req.params.chatroomId,
    userId = req._id,
    amount = Number(req.body.amount),
    quantity = req.body.quantity,
    unitPrice = req.body.unitPrice;

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
      error.errorHandler(res, "chatroom not found", "chat");
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
      quantity,
      unitPrice,
    });
    wallet.supplier.user = userId;
    await wallet.save();

    chatroom.wallet = wallet._id;
    await chatroom.save();

    const updatedChatroom = await ChatRoom.findById(chatroomId)
      .populate("wallet")
      .populate("users", "firstName lastName fullName profileImage");

    const updatedWallet = await Wallet.findById(wallet._id)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
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
  const amount = Math.round(Number(req.body.amount)) * 100,
    subaccount = req.params.walletAddress,
    userId = req._id,
    quantity = req.body.quantity;
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
    const wallet = await Wallet.findOne({ walletAddress: subaccount })
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });
    if (!wallet) {
      error.errorHandler(res, "wallet not found", "wallet");
      return;
    }

    const params = JSON.stringify({
      email: user.details.email,
      amount,
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
            quantity,
          });
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

// verify chat wallet payment
module.exports.verifyChatWalletPayment = async (req, res, next) => {
  const walletAddress = req.params.walletAddress,
    amount = req.body.amount,
    reference = req.body.reference,
    chatId = req.body.chatId,
    userId = req._id;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chatroom
    const chat = await Chat.findById(chatId);
    if (!chat) {
      error.errorHandler(res, "invalid chat", "chat");
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

    const alreadyVerified = await wallet.referenceCodes.find(
      (partner) => partner.reference === reference
    );
    if (alreadyVerified.paymentStatus) {
      error.errorHandler(res, "payment already verified", "payment");
      return;
    }

    // verify transaction
    Paystack.transaction
      .verify(reference)
      .then(async (transaction) => {
        if (transaction.data.status === "success") {
          wallet.balance += amount;
          await wallet.referenceCodes.map((partner) => {
            if (
              partner.user._id.toString() === userId &&
              partner.reference === reference
            ) {
              partner.paymentStatus = true;
            }
          });

          const paidPartners = await wallet.referenceCodes.filter(
            (partner) => partner.paymentStatus === true
          );
          if (wallet.balance >= wallet.amount) {
            wallet.paymentComplete = true;
          }
          await wallet.save();

          const walet = await Wallet.findOne({ walletAddress })
            .populate({
              path: "referenceCodes",
              populate: {
                path: "user",
                select: "firstName lastName fullName profileImage",
              },
            })
            .populate("supplier");
          res.status(200).json({ wallet: walet, chat });
        } else {
          const partner = await wallet.referenceCodes.find(
            (partner) => partner.reference === reference
          );
          await wallet.referenceCodes.pull(partner._id);
          await wallet.save();

          const walet = await Wallet.findOne({
            walletAddress,
          }).populate({
            path: "referenceCodes",
            populate: {
              path: "user",
              select: "firstName lastName fullName profileImage",
            },
          });

          res.status(200).json({
            success: false,
            message: "payment not successful",
            wallet: walet,
            chat,
          });
        }
      })
      .catch((err) => console.log(err));
  } catch (err) {
    error.error(err, next);
  }
};

// verify chatroom wallet payment
module.exports.verifyChatroomWalletPayment = async (req, res, next) => {
  const walletAddress = req.params.walletAddress,
    reference = req.body.reference,
    chatroomId = req.body.chatroomId,
    amount = req.body.amount,
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

    const alreadyVerified = await wallet.referenceCodes.find(
      (partner) => partner.reference === reference
    );
    if (alreadyVerified.paymentStatus) {
      error.errorHandler(res, "payment already verified", "payment");
      return;
    }

    // verify transaction
    Paystack.transaction
      .verify(reference)
      .then(async (transaction) => {
        if (transaction.data.status === "success") {
          wallet.balance += amount;
          await wallet.referenceCodes.map((partner) => {
            if (
              partner.user._id.toString() === userId &&
              partner.reference === reference
            ) {
              partner.paymentStatus = true;
            }
          });

          const paidPartners = await wallet.referenceCodes.filter(
            (partner) => partner.paymentStatus === true
          );
          if (
            paidPartners.length >= wallet.partners &&
            wallet.balance >= wallet.amount
          ) {
            wallet.paymentComplete = true;
          }
          await wallet.save();

          const walet = await Wallet.findOne({ walletAddress })
            .populate({
              path: "referenceCodes",
              populate: {
                path: "user",
                select: "firstName lastName fullName profileImage",
              },
            })
            .populate({
              path: "supplier",
              populate: {
                path: "user",
                select: "firstName lastName fullName profileImage",
              },
            });
          res.status(200).json({ wallet: walet, chatroom });
        } else {
          const partner = await wallet.referenceCodes.find(
            (partner) => partner.reference === reference
          );
          await wallet.referenceCodes.pull(partner._id);
          await wallet.save();

          const walet = await Wallet.findOne({
            walletAddress,
          }).populate({
            path: "referenceCodes",
            populate: {
              path: "user",
              select: "firstName lastName fullName profileImage",
            },
          });
          res.status(200).json({
            success: false,
            message: "payment not successful",
            wallet: walet,
            chatroom,
          });
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
    const chat = await Chat.findById(chatId);
    if (!chat) {
      error.errorHandler(res, "invalid chat", "chat");
      return;
    }

    // get and validate wallet
    const wallet = await Wallet.findById(chat.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
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
      chat,
    });
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
    const wallet = await Wallet.findById(chatroom.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
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

// acknowledge receipt of chat business end
module.exports.acknowledgeChatBusiness = async (req, res, next) => {
  const chatId = req.body.chatId,
    userId = req._id;

  try {
    // validate user
    const user = await getUser(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate chatroom
    const chat = await Chat.findById(chatId);
    if (!chat) {
      error.errorHandler(res, "invalid chat", "chat");
      return;
    }

    // get wallet
    const wallet = await Wallet.findById(chat.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });
    if (!wallet) {
      error.errorHandler(res, "invalid wallet", "wallet");
      return;
    }
    if (wallet.supplier.user._id.toString() === userId) {
      wallet.supplier.receipt = true;
      await wallet.save();
    } else {
      await wallet.referenceCodes.map((partner) => {
        if (partner.user._id === userId) {
          partner.receipt = true;
        }
      });
      await wallet.save();
    }

    const walet = await Wallet.findById(chat.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });

    res.status(200).json({
      success: true,
      message: "acknowledgement successful",
      wallet: walet,
      chat,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// acknowledge receipt of chatroom business end
module.exports.acknowledgeChatroomBusiness = async (req, res, next) => {
  const chatroomId = req.body.chatroomId,
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
    const wallet = await Wallet.findById(chatroom.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });
    if (!wallet) {
      error.errorHandler(res, "invalid wallet", "wallet");
      return;
    }
    if (wallet.supplier.user._id.toString() === userId) {
      wallet.supplier.receipt = true;
      await wallet.save();
    } else {
      await wallet.referenceCodes.map((partner) => {
        if (partner.user._id === userId) {
          partner.receipt = true;
        }
      });
      await wallet.save();
    }

    const walet = await Wallet.findById(chatroom.wallet)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });

    res.status(200).json({
      success: true,
      message: "acknowledgement successful",
      wallet: walet,
      chatroom,
    });
  } catch (err) {
    error.error(err, next);
  }
};
