import {
  goOnline,
  goOffline,
  pauseInstructor,
  resumeInstructor
} from "../services/instructorService.js";

import express from "express";
import {
  createInstructor,
  activateInstructor
} from "../services/instructorService.js";

const router = express.Router();

router.post("/create", createInstructor);
router.post("/activate", activateInstructor);
router.post("/go-online", goOnline);
router.post("/go-offline", goOffline);
router.post("/pause", pauseInstructor);
router.post("/resume", resumeInstructor);

export default router;
