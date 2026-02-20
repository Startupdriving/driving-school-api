import express from "express";
import { findEligibleInstructors } from "../services/matchingService.js";

const router = express.Router();

router.get("/:lesson_request_id/eligible", findEligibleInstructors);

export default router;
