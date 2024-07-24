const jwt = require("jsonwebtoken");
const OTP = require("../model/otp");

module.exports = {
  generateOTP: async () => {
    function generateCode(length, chars) {
      let result = "";
      for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
      return result;
    }
    let code = generateCode(
      6,
      "abcdefghijklm0123456789nopqrstuvwxyz0123456789ABCDEFGHIJKLM0123456789NOPQRSTUVWXYZ"
    );

    // Create jsonwebtoken
    const token = jwt.sign({ code }, process.env.jwtKey, {
      algorithm: "HS256",
      expiresIn: process.env.jwtExpirySeconds,
    });

    const otp = new OTP({ code, token });
    await otp.save();

    return { otp: otp._id, code };
  },
  generateId: () => {
    function randomString(length, chars) {
      let result = "";
      for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
      return result;
    }
    let code = randomString(
      6,
      "abcdefghijklm0123456789nopqrstuvwxyz0123456789ABCDEFGHIJKLM0123456789NOPQRSTUVWXYZ"
    );
    return code;
  },
  verifyOTP: async (res, code) => {
    const otp = await OTP.findOne({ code });
    const authorizedotp = await jwt.verify(otp.token, env.process.jwtKey);
    if (!authorizedotp) {
      return false;
    }
    return { success: true };
  },
};
