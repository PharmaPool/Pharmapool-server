const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  email: { type: String, required: true, default: "info@pharmapoolng.com" },
  passkey: { type: String },
});

module.exports = mongoose.model("Admin", adminSchema);
