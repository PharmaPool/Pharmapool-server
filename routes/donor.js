const express = require("express");
const router = express.Router();

const donorController = require("../controller/donor");

router.post("/register", donorController.createDonor);
router.post("/donate/:walletAddress", donorController.acceptDonation);

module.exports = router;
