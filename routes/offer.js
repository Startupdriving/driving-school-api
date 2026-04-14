import express from "express";
import {
  counterOffer,
  acceptOffer,
  rejectOffer
} from "../services/offerNegotiationService.js";

const router = express.Router();

router.post("/counter", counterOffer);
router.post("/accept", acceptOffer);
router.post("/reject", rejectOffer);

export default router;
