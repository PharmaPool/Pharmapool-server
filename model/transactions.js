const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  product: { type: String, required: true },
  brand: { type: String, required: true },
  strength: { type: String, required: true },
  manufacturer: { type: String, required: true },
  dateIn: { type: Date, required: true, default: Date.now() },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  transactionDate: { type: Date, required: true, default: Date.now() },
  remark: { type: String, required: true },
});

module.exports = mongoose.model("Transactions", transactionSchema);
