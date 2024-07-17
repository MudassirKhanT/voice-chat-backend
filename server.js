require("dotenv").config();
const DbConnect = require("./databse");
const express = require("express");
const app = express();
const router = require("./routes");
const cors = require("cors");
const cookieParser = require("cookie-parser");

app.use(cookieParser());
const corsOption = {
  credentials: true,
  origin: ["http://localhost:3000"],
};
app.use(cors(corsOption));
app.use("/storage", express.static("storage"));
const PORT = process.env.PORT || 5500;
DbConnect();
app.use(express.json({ limit: "8mb" }));
app.use(router);
app.get("/", (req, res) => {
  res.send("Hello from express js");
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
