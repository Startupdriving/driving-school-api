import express from "express";
import {
  createStudent,
  activateStudent,
  deactivateStudent
} from "../services/studentService.js";

const router = express.Router();

/*
  WRITE COMMANDS
  These endpoints handle commands (not queries).
  Database enforces rules via triggers.
*/

// Create student (creates identity + student_created event)
router.post("/student/create", createStudent);

// Activate student
router.post("/student/activate", activateStudent);

// Deactivate student
router.post("/student/deactivate", deactivateStudent);

export default router;
