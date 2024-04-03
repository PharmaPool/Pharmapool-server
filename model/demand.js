const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const demandSchema = new Schema({
  creator: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  business: { type: String, default: "demand" },
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
      price: { type: String, required: true },
    },
  ],
  status: { type: Boolean, required: true, default: false },
  deadline: { type: String, required: true },
});

module.exports = mongoose.model("Demand", demandSchema);
