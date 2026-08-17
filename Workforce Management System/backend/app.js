const express = require("express");
const cors = require("cors");
const path = require("path");

const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// API
app.use("/api", routes);

// Default route
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../frontend/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Frontend isn't bundled with this deployment (e.g. on Vercel the
      // frontend is a separate project) — just confirm the API is alive.
      res.json({ message: "Workforce Management backend is running 🚀" });
    }
  });
});

// ❤️ HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend running successfully 🚀"
  });
});


// ❌ 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


module.exports = app;