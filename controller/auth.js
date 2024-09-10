const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
// const { validationResult } = require("express-validator");
const crypto = require("crypto");

dotenv.config();

const Business = require("../model/business");
const User = require("../model/user");
const Admin = require("../model/admin");

const error = require("../util/error-handling/errorHandler");

const { userExists } = require("../util/user");
const mailer = require("../util/nodemailer");
const { generateOTP, verifyOTP } = require("../util/otp");

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
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // Check if a email already exist
    const emailExist = await userExists("email", email);
    if (emailExist) {
      error.errorHandler(res, "email already exists", "email");
    } else {
      // Continue if there are no errors
      const hashedPassword = await bcrypt.hash(password, 12);

      // Get otp
      const otp = await generateOTP();

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
        otp: otp.otp,
      });

      // Send verification mail to user
      await mailer(
        email,
        "Verify you email",
        "Welcome to Pharmapool. Below is the code to activate your account",
        `${firstName} ${lastName}`,
        otp.code
      );

      // Save user in database
      await user.save();

      // Send response back to client
      res
        .status(200)
        .json({ message: "Sign up successful", type: "user", user });
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

    if (!user) {
      error.errorHandler(res, "incorrect email", "email");
      return;
    }

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

    // set loggedIn to true
    user.loggedIn = true;
    user.save();

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

/***************
 * User Logout *
 ***************/
module.exports.userLogout = async (req, res, next) => {
  const userId = req.params._id;

  try {
    // get and validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "user not found", "user");
      return;
    }

    // continue if there are no errors
    user.loggedIn = false;

    // save changes
    user.save();

    // Create jsonwebtoken
    const token = jwt.sign(
      { user: user, email: user.email },
      process.env.jwtKey,
      { algorithm: "HS256", expiresIn: process.env.jwtExpirySeconds }
    );

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "user logged out successfully", token });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Verify Account *
 ******************/
module.exports.verifyAccount = async (req, res, next) => {
  const userId = req.params._id,
    code = req.body.code;

  try {
    // Check for validation errors
    // verify user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "invalid user", "user");
      return;
    }

    // validate otp
    const validatedotp = await verifyOTP(code);
    if (!validatedotp) {
      error.errorHandler(res, "invalid otp", "otp");
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
    // Check for validation errors
    // const validatorErrors = validationResult(req);
    // error.validationError(validatorErrors);

    if (email === "") {
      error.errorHandler(res, "Invalid Email", "email");
    }

    // Check if user exists with email
    const user = await User.findOne(
      { "details.email": email },
      "details resetToken resetExpiration firstName lastName"
    );

    // Check if user is undefined
    if (!user) {
      error.errorHandler(res, "No user found with email", "email");
      return;
    }

    // Continue if there are no errors
    // generate otp
    const otp = await generateOTP();

    // Generate random reset token
    const resetToken = await crypto.randomBytes(32).toString("hex");

    // Calculate passwordExpiration
    const resetExpiration = Date.now() + 3600000;

    // Update found user object
    user.otp = otp;
    user.resetToken = resetToken;
    user.resetExpiration = resetExpiration;

    // Send password reset mail to user
    await mailer(
      email,
      "password reset",
      "use this one time passcode below for your password reset",
      `${user.firstName} ${user.lastName}`,
      otp.code
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
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

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
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

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

/**********************
 * Get All Businesses *
 **********************/
module.exports.getAllBusinesses = async (req, res, next) => {
  try {
    // continue if there are no errors

    // get all demand
    const business = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");

    const businesses = [...business].reverse();

    res.status(200).json({
      message: "all businesses fetched successfully",
      businesses,
      loggedIn: false,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// Register admin
module.exports.registerAdmin = async (req, res, next) => {
  const email = req.body.email;

  try {
    // validate user
    const emailExists = await Admin.findOne({ email });
    if (emailExists) {
      error.errorHandler(res, "email already exists", "admin");
      return;
    }

    // continue if there are no errors
    const admin = new Admin({ email });
    await admin.save();

    res.status(200).json({
      success: true,
      message: "admin registered successfully",
      type: "admin",
    });
  } catch (err) {
    error.error(err, next);
  }
};

// Admin login
module.exports.adminEmailLogin = async (req, res, next) => {
  const email = req.body.email;

  try {
    // validate user
    const admin = await Admin.findOne({ email });
    if (!admin) {
      error.errorHandler(res, "admin not found", "admin");
      return;
    }

    // continue if there are no errors
    const adminCode = await generateOTP();

    admin.passkey = adminCode.code;
    await admin.save();

    await mailer(
      email,
      "admin verification",
      "Use this one time passkey to login",
      "admin",
      adminCode.code
    );

    res
      .status(200)
      .json({ message: "an OTP has been sent to your mail", type: "admin" });
  } catch (err) {
    error.error(err, next);
  }
};

// Admin passkey login
module.exports.adminPasskeyLogin = async (req, res, next) => {
  const email = req.body.email,
    passkey = req.body.passkey;

  console.log(passkey);

  try {
    // validate user
    const admin = await Admin.findOne({ email });
    if (!admin) {
      error.errorHandler(res, "admin not found", "admin");
      return;
    }

    // verify otp
    const otp = verifyOTP(passkey);
    if (!otp) {
      error.errorHandler(res, "invalid otp", "otp");
      return;
    }

    // validate passkey
    const passkeyMatch = passkey === admin.passkey;
    if (!passkeyMatch) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors

    // Create jsonwebtoken
    const token = jwt.sign(
      { user: admin, email: admin.email },
      process.env.jwtKey,
      { algorithm: "HS256", expiresIn: process.env.jwtExpirySeconds }
    );

    res
      .status(200)
      .json({ success: true, message: "admin signin successful", token });
  } catch (err) {
    error.error(err, next);
  }
};
