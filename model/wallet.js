const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
  walletAddress: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now() },
  referenceCodes: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      reference: { type: String },
      paymentStatus: { type: Boolean, default: false },
      receipt: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 },
    },
  ],
  walletId: { type: Number },
  balance: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  partners: { type: Number, default: 1 },
  paymentComplete: { type: Boolean, default: false },
  supplier: {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    receipt: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model("Wallet", walletSchema);
