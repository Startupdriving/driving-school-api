import express from "express";
import { confirmPayment } from "../services/paymentService.js";

const router = express.Router();

router.post("/confirm", confirmPayment);

export default router;
