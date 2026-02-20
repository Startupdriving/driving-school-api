import express from "express";
import { requestLesson } from "../services/lessonRequestService.js";

const router = express.Router();

router.post("/request", requestLesson);

export default router;
