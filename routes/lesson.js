import express from "express";
import { scheduleLesson } from "../services/lessonService.js";

const router = express.Router();

router.post("/schedule", scheduleLesson);

export default router;
