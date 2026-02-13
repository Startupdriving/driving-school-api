import express from "express";
import {
  createInstructor,
  activateInstructor
} from "../services/instructorService.js";

const router = express.Router();

router.post("/create", createInstructor);
router.post("/activate", activateInstructor);

export default router;
