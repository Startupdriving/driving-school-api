import express from "express";
import {
  scheduleLesson,
  cancelLesson,
  completeLesson
} from "../services/lessonService.js";

const router = express.Router();

router.post("/schedule", scheduleLesson);
router.post("/cancel", cancelLesson);
router.post("/complete", completeLesson);

export default router;

