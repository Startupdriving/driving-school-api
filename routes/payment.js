import express from "express";
import { confirmPayment, completePayout } from "../services/paymentService.js";

const router = express.Router();

router.post("/confirm", confirmPayment);
router.post("/payout", completePayout);

export default router;
