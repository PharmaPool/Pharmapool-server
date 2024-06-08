const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const crypto = require("crypto");

dotenv.config();

const User = require("../model/user");

const error = require("../util/error-handling/errorHandler");

const { userExists } = require("../util/user");
const mailer = require("../util/nodemailer");

/**************
 * User Signup*
 * ************/
module.exports.userSignup = async (req, res, next) => {
  const email = req.body.email,
    firstName = req.body.firstName,
    lastName = req.body.lastName,
    password = req.body.password,
    phoneNumber = req.body.phoneNumber,
    gender = req.body.gender,
    state = req.body.state,
    address = req.body.address,
    registrationNumber = req.body.registrationNumber;

  try {
    // Check for validation errors
    // const validatorErrors = validationResult(req);
    // error.validationError(validatorErrors, res);

    // Check if a email already exist
    const emailExist = await userExists("email", email);
    if (emailExist) {
      error.errorHandler(res, "email already exists", "email");
    } else {
      // Continue if there are no errors
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user object
      const user = new User({
        firstName,
        lastName,
        details: {
          email,
          phoneNumber,
          gender,
          state,
          address,
          registrationNumber,
        },
        password: hashedPassword,
      });

      // Send verification mail to user
      await mailer(
        email,
        "sign up verification",
        "Welcome to Pharmapool. Kindly click the button to verify your account",
        `${firstName} ${lastName}`,
        "https://facebook.com",
        "verify",
        "https://google.com"
      );

      // Save user in database
      const newUser = await user.save();

      // Send response back to client
      res
        .status(200)
        .json({ message: "Sign up successful", type: "user", newUser });
    }
  } catch (err) {
    error.error(err, next);
  }
};

/**************
 * User Login *
 **************/
module.exports.userLogin = async (req, res, next) => {
  const email = req.body.email,
    password = req.body.password;

  try {
    // Check for validation errors
    // const validatorErrors = validationResult(req);
    // error.validationError(validatorErrors);

    // Check if user exists
    const user = await userExists("email", email);

    if (!user) error.errorHandler(res, "incorrect email", "email");

    // Check for password match
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      error.errorHandler(res, "Incorrect password", "password");
      return;
    }

    if (!user.verified) {
      error.errorHandler(res, "Not verified! Check email to verify", "user");
      return;
    }
    // Continue if there are no errors

    // Create jsonwebtoken
    const token = jwt.sign(
      { user: user, email: user.email },
      process.env.jwtKey,
      { algorithm: "HS256", expiresIn: process.env.jwtExpirySeconds }
    );

    // Send response to client
    res.status(200).json({ token });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Verify Account *
 ******************/
module.exports.verifyAccount = async (req, res, next) => {
  const email = req.params.email;

  try {
    // verify user
    const user = await User.findOne({ "details.email": email });
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // continue if no errors
    user.verified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your account has been verified. Continue to Login",
    });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Password Reset *
 ******************/
module.exports.passwordReset = async (req, res, next) => {
  const email = req.body.email;

  try {
    if (email === "") {
      error.errorHandler(res, "Invalid Email", "email");
    }

    // Check if user exists with email
    const user = await User.findOne(
      { "details.email": email },
      "details resetToken resetExpiration firstName lastName"
    );

    // Check for validation errors
    const validatorErrors = validationResult(req);
    error.validationError(validatorErrors, res);

    // Check if user is undefined
    if (!user) {
      error.errorHandler(res, "No user found with email", "email");
      return;
    }

    // Continue if there are no errors

    // Generate random reset token
    const resetToken = await crypto.randomBytes(32).toString("hex");

    // Calculate passwordExpiration
    const resetExpiration = Date.now() + 3600000;

    // Update found user object
    user.resetToken = resetToken;
    user.resetExpiration = resetExpiration;

    // Send password reset mail to user
    await mailer(
      email,
      "password reset",
      "Thanks for choosing Pharmapool. Kindly click the button to reset your password",
      `${user.firstName} ${user.lastName}`,
      "#",
      "reset",
      `https://pharmapoolng.com/password-reset/${email}`
    );

    // Save user updates to database
    await user.save();

    // Send response to client
    res.status(200).json({
      message: "A password reset link has been sent to your email",
      type: "password reset",
      resetToken,
    });
  } catch (err) {
    error.error(err, next);
  }
};

/***********************
 * Get Password Token *
 ***********************/
module.exports.getPasswordToken = async (req, res, next) => {
  const email = req.params.email;

  try {
    // Check for matching token on a user
    const user = await User.findOne(
      { "details.email": email },
      "resetToken resetExpiration"
    );

    // Check if user is undefined
    if (!user) {
      error.errorHandler(res, "Invalid user", "user");
      return;
    }

    // Check if token has expired
    if (user.resetExpiration < Date.now()) {
      // Clear user resetToken and expiration
      // user.resetToken = undefined;
      // user.resetExpiration = undefined;

      // Save user to database
      await user.save();

      error.errorHandler(
        res,
        "password reset session has expired. kindly request for the reset link again.",
        "token"
      );
      return;
    }

    res.status(200).json({ token: user.resetToken });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Password Change *
 ******************/
module.exports.passwordChange = async (req, res, next) => {
  const resetToken = req.params.resetToken,
    password = req.body.password;

  try {
    // Get user
    const user = await User.findOne({ resetToken }, "password resetToken");

    // Check if user is undefined
    if (!user) {
      error.errorHandler(res, "No user found", "user");
      return;
    }

    // Continue if there are no errors

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Assign new password to user
    user.password = hashedPassword;

    // Remove resetToken/Expiration
    user.resetToken = undefined;
    user.resetExpiration = undefined;

    //  Save user changes to database
    await user.save();

    // Send response back to client
    res
      .status(201)
      .json({ message: "password successfully changed", type: "password" });
  } catch (err) {
    error.error(err, next);
  }
};
