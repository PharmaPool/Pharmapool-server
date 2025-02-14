const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DonorSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
});

module.exports = mongoose.model("Donor", DonorSchema);