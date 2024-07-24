const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  code: { type: String, required: true, default: "" },
  token: { type: String, required: true, default: "" },
});

module.exports = mongoose.model("OTP", otpSchema);
