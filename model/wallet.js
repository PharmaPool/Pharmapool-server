const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletSchema = new Schema({
    walletAddress: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, required: true, ref: "User" }],
    createdAt:{type:Date, required:true, default:Date.now()}
});

module.exports= mongoose.model("Wallet", walletSchema)