import express from "express";
import dotenv from "dotenv";
import pool from "./db.js";
import readRoutes from "./routes/read.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// 🔎 TEMP DEBUG — REMOVE LATER
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Root test route
app.get("/", (req, res) => {
  res.send("API running");
});

// Mount read routes
app.use("/read", readRoutes);

// Health check route (optional but useful)
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "DB connected" });
  } catch (err) {
    res.status(500).json({ status: "DB error", error: err.message });
  }
});

const PORT = process.env.PORT || 5173;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
