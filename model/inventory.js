const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
  product: { type: String, required: true },
  inventory: [
    {
      brand: { type: String, required: true },
      strength: { type: Number, required: true },
      manufacturer: { type: String, required: true },
      dateIn: { type: Date, required: true, default: Date.now() },
      expiryDate: { type: Date, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  total: { type: Number, default: 0 },
  owner: { type: Schema.Types.ObjectId, ref: "Pharmacy", required: true },
});

module.exports = mongoose.model("Inventory", inventorySchema);
