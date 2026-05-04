import pool from "./db.js";
import offerRoutes from "./routes/offer.js";
import { updateInstructorLocation } from "./services/instructorLocationService.js";
import { rebuildLiquidity } from "./services/liquidityService.js";
import paymentRoutes from "./routes/payment.js";
import { startDispatchWorker } from "./services/dispatchWorker.js";
import matchingRoutes from "./routes/matching.js";
import lessonRequestRoutes from "./routes/lessonRequest.js";
import lessonRoutes from "./routes/lesson.js";
import carRoutes from "./routes/car.js";
import instructorRoutes from "./routes/instructor.js";
import { runMigrations } from "./db/migrate.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";
import adminRoutes from "./routes/admin.js";
import rescheduleRoutes from "./routes/reschedule.js";
import { WebSocketServer } from "ws";
import { registerClient, removeClient } from "./services/wsService.js";
import http from "http";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5174"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

// routes
app.use("/read", readRoutes);
app.use("/read/matching", matchingRoutes);


app.use("/write", writeRoutes);
app.use("/write/instructor", instructorRoutes);
app.use("/write/car", carRoutes);
app.use("/write/lesson", lessonRoutes);
app.use("/write/lesson-request", lessonRequestRoutes);
app.use("/write/payment", paymentRoutes);
app.use("/write/offer", offerRoutes);
app.use("/write/reschedule", rescheduleRoutes);

app.use("/admin", adminRoutes);


const PORT = process.env.PORT || 5173;

// migrations
await runMigrations();

// ✅ CREATE SERVER FIRST
const server = http.createServer(app);

// ✅ CREATE WS AFTER SERVER
const wss = new WebSocketServer({ server });

// ✅ HANDLE CONNECTION
wss.on("connection", (ws, req) => {

  const params = new URLSearchParams(req.url.replace('/?', ''));

  const studentId = params.get("student_id");
  const instructorId = params.get("instructor_id");

  if (studentId) {
    registerClient(studentId, ws);
    console.log("WS REGISTER STUDENT:", studentId);
  }

  if (instructorId) {
    registerClient(instructorId, ws);
    console.log("WS REGISTER INSTRUCTOR:", instructorId);
  }

  ws.on("close", () => {
    removeClient(ws);
  });
});

// ✅ START SERVER
server.listen(PORT, () => {
  console.log("Server running...");
});

// start workers
startDispatchWorker();

// liquidity scheduler
setInterval(async () => {
  try {
    await rebuildLiquidity();
    console.log("Liquidity rebuild executed");
  } catch (err) {
    console.error(err);
  }
}, 60000);
