//import { rebuildLiquidity } from "./services/liquidityService.js";
import pool from "./db.js";
import paymentRoutes from "./routes/payment.js";
import { startDispatchWorker } from "./services/dispatchWorker.js";
import matchingRoutes from "./routes/matching.js";
import lessonRequestRoutes from "./routes/lessonRequest.js";
import lessonRoutes from "./routes/lesson.js";
import carRoutes from "./routes/car.js";
import instructorRoutes from "./routes/instructor.js";
import { runMigrations } from "./db/migrate.js";
import express from "express";
import dotenv from "dotenv";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

// Read routes
app.use("/read", readRoutes);
app.use("/read/matching", matchingRoutes);

// Write routes
app.use("/write", writeRoutes);
app.use("/write/instructor", instructorRoutes);
app.use("/write/car", carRoutes);
app.use("/write/lesson", lessonRoutes);
app.use("/write/lesson-request", lessonRequestRoutes);
app.use("/write/payment", paymentRoutes);

const PORT = process.env.PORT || 5173;

// Run migrations first
await runMigrations();

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
  startDispatchWorker();
  // 🔄 Start liquidity scheduler
/*  setInterval(async () => {
    try {
      await rebuildLiquidity();
      console.log("Liquidity rebuild executed");
    } catch (err) {
      console.error("Liquidity scheduler error:", err);
    }
  }, 60000); // every 60 seconds
});*/
