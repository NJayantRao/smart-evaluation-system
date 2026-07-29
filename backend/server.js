require("express-async-errors");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exams");
const resultRoutes = require("./routes/results");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ---------------- Middleware ----------------

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- Routes ----------------

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Smart Evaluation API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);

// ---------------- Error Handler (must be last) ----------------

app.use(errorHandler);

// ---------------- Database + Server ----------------
// Wait for the DB connection before accepting traffic, so requests never
// race a not-yet-ready mongoose connection.

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
