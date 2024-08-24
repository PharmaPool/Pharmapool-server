const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  product: { type: String, default: "" },
  brand: { type: String, default: "" },
  strength: { type: String, default: "" },
  manufacturer: { type: String, default: "" },
  dateIn: { type: Date, default: Date.now() },
  expiryDate: { type: Date, default: "" },
  quantity: { type: Number, default: 0 },
  transactionDate: { type: Date, default: Date.now() },
  remark: { type: String, default: "" },
});

module.exports = mongoose.model("Transactions", transactionSchema);
