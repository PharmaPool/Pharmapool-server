const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const error = require("../error-handling/errorHandler");

dotenv.config();

const isAuth = async (req, res, next) => {
  // Get headers
  const headers = req.get("Authorization");

  // Check if headers is empty
  if (!headers) {
    req.isAuth = false;
    error.errorHandler(res, "not authorized, login again", "authorization");
    return next();
  }

  // Check if headers, extract the token out of it
  const token = headers;

  let authorizedToken;

  // Verify token
  try {
    authorizedToken = await jwt.verify(token, process.env.jwtKey);
  } catch (err) {
    req.isAuth = false;
    error.errorHandler(res, "not authorized", "authorization");
    return next();
  }

  // Check if authorized token
  if (!authorizedToken) {
    req.isAuth = false;
    error.errorHandler(res, "not authorized", "authorization");
    return next();
  }

  // Continue if there are no errors
  req.isAuth = true;

  // Set userId and email
  req._id = authorizedToken.user._id;

  next();
};

module.exports = isAuth;
