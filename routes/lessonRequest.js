import express from "express";
import { requestLesson, acceptOffer } from "../services/lessonRequestService.js";

const router = express.Router();

router.post("/request", requestLesson);
router.post("/accept-offer", acceptOffer);

export default router;

