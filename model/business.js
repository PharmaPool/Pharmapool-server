const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const businessesSchema = new Schema({
  creator: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  business: { type: String, required: true },
  content: {
    type: String,
    required: true,
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
  },
  interestedPartners: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      price: { type: String },
    },
  ],
  status: { type: Boolean, required: true, default: false },
  deadline: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Business", businessesSchema);
