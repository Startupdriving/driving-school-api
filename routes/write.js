import { setInstructorAvailability } from "../services/instructorService.js";
import express from "express";
import {
  createStudent,
  activateStudent,
  deactivateStudent
} from "../services/studentService.js";

const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);
router.post("/instructor/availability", setInstructorAvailability);

export default router;

