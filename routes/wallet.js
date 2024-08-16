const express = require("express");
const router = express.Router();
const walletController = require("../controller/wallet");

router.post("/chat/:chatId", walletController.createChatWallet);
router.get("/chat/:chatId", walletController.getChatWalletDetails);
router.post("/chatroom/:chatroomId", walletController.createChatRoomWallet);
router.get("/chatroom/:chatroomId", walletController.getChatRoomWalletDetails);
router.post(
  "/payment/accept/:walletAddress",
  walletController.acceptWalletPayment
);
router.post(
  "/payment/verify/chat/:walletAddress",
  walletController.verifyChatWalletPayment
);
router.post(
  "/payment/verify/chatroom/:walletAddress",
  walletController.verifyChatroomWalletPayment
);

module.exports = router;