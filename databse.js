const mongoose = require("mongoose");

function DbConnect() {
  const DbUrl = process.env.DB_URL;
  mongoose.connect(DbUrl);
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "Connection Error:"));
  db.once("open", () => {
    console.log("DB Connected...");
  });
}

module.exports = DbConnect;
