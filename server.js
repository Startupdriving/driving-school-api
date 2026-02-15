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

// Write routes
app.use("/write", writeRoutes);
app.use("/write/instructor", instructorRoutes);
app.use("/write/car", carRoutes);

const PORT = process.env.PORT || 5173;

runMigrations().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on port ${PORT}`);
  });
});


