import express from "express";
import dotenv from "dotenv";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("API running");
});

// Read routes
app.use("/read", readRoutes);

// Write routes
app.use("/write", writeRoutes);

const PORT = process.env.PORT || 5173;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});

