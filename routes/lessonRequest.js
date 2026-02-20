import express from "express";
import { requestLesson, sendOffer, acceptOffer } from "../services/lessonRequestService.js";

const router = express.Router();

router.post("/request", requestLesson);
router.post("/send-offer", sendOffer);
router.post("/accept-offer", acceptOffer);

export default router;

