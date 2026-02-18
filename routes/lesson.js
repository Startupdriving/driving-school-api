import express from "express";
import {
  scheduleLesson,
  cancelLesson,
  completeLesson,
  rescheduleLesson
} from "../services/lessonService.js";


const router = express.Router();

router.post("/schedule", scheduleLesson);
router.post("/cancel", cancelLesson);
router.post("/complete", completeLesson);
router.post("/schedule", scheduleLesson);
router.post("/cancel", cancelLesson);
router.post("/complete", completeLesson);
router.post("/reschedule", rescheduleLesson);

export default router;

