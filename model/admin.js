const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  email: { type: String, required: true },
  passkey: { type: String, required: true, default: null },
});

module.exports = mongoose.model("Admin", adminSchema);
