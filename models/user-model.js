const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userShema = new Schema(
  {
    phone: { type: String, required: true },
    activated: { type: Boolean, required: false, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userShema, "users");
