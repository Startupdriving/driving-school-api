import { requestLesson, sendOffer } from "../services/lessonRequestService.js";
import express from "express";
import { requestLesson } from "../services/lessonRequestService.js";

const router = express.Router();

router.post("/request", requestLesson);
router.post("/send-offer", sendOffer);

export default router;
