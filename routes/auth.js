const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const authController = require("../controller/auth");
const businessController = require("../controller/business")

router.get("/", businessController.getAllBusinesses)
router.post(
  "/signup",
  authController.userSignup
);
router.post("/verify/:_id", authController.verifyAccount);
router.post(
  "/signin",
  authController.userLogin
);
router.patch("/signout/:_id", authController.userLogout)
router.post(
  "/password-reset",
  authController.passwordReset
);
router.get("/password-reset/:email", authController.getPasswordToken);
router.post("/password-reset/:resetToken", authController.passwordChange);

module.exports = router;
