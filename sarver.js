import express from "express";
import dotenv from "dotenv";
import pool from "./db.js";
import readRoutes from "./routes/read.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// 🔎 DEBUG: Print runtime DATABASE_URL
console.log("=== RUNTIME DATABASE_URL ===");
console.log(process.env.DATABASE_URL);
console.log("============================");

// Root route
app.get("/", (req, res) => {
  res.send("API running");
});

// Health check route
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "DB connected" });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(500).json({
      status: "DB error",
      error: err.message,
    });
  }
});

// Read routes
app.use("/read", readRoutes);

const PORT = process.env.PORT || 5173;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
