const express = require("express");
const router = express.Router();
const walletController = require("../controller/wallet");

router.post("/chat", walletController.createChatWallet);

module.exports = router;
