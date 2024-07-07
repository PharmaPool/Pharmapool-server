const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const authController = require("../controller/auth");

router.post(
  "/signup",
  [
    body("firstName", "first name should not be empty").not().isEmpty(),
    body("lastName", "last name should not be empty").not().isEmpty(),
    body("email", "email is invalid").isEmail().not().isEmpty(),
    body("password", "password should not be less than 8 characters long")
      .isLength({ min: 8 })
      .not()
      .isEmpty(),
    body("phoneNumber", "number should not be empty").not().isEmpty(),
  ],
  authController.userSignup
);
router.get("/verify/:_id", authController.verifyAccount);
router.post(
  "/signin",
  [
    body("email", "email is invalid").isEmail().not().isEmpty(),
    body("password", "password should not be less than 8 characters long")
      .isLength({ min: 8 })
      .not()
      .isEmpty(),
  ],
  authController.userLogin
);
router.post(
  "/password-reset",
  authController.passwordReset
);
router.get("/password-reset/:email", authController.getPasswordToken);
router.post("/password-reset/:resetToken", authController.passwordChange);

module.exports = router;
