const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const authController = require("../controller/auth");

router.get("/", authController.getAllBusinesses);
router.post("/signup", authController.userSignup);
router.post("/verify/:_id", authController.verifyAccount);
router.post("/signin", authController.userLogin);
router.patch("/signout/:_id", authController.userLogout);
router.post("/password-reset", authController.passwordReset);
router.get("/password-reset/:email", authController.getPasswordToken);
router.post("/password-reset/:resetToken", authController.passwordChange);

router.post("/admin/signup", authController.registerAdmin);
router.post("/admin/signin", authController.adminEmailLogin);
router.post("/admin/passkey", authController.adminPasskeyLogin);

module.exports = router;
