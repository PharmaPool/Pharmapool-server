const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pharmacySchema = new Schema({
  businessName: { type: String, required: true },
  location: { type: String, required: true },
  logo: {
    imageUrl: { type: String },
    imageId: { type: String },
  },
  logo: {
    imageUrl: { type: String },
    imageId: { type: String },
  },
  contactNumber: [{ type: String }],
  about: { type: String },
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  inventory: [{ type: Schema.Types.ObjectId, ref: "Inventory" }],
});

module.exports = mongoose.model("Pharmacy", pharmacySchema);
