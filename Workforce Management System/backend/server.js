const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 5000;


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log("=====================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log("=====================================");
});


// ❌ HANDLE UNCAUGHT ERRORS
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});