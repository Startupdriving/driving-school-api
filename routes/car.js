import express from "express";
import {
  createCar,
  activateCar
} from "../services/carService.js";

const router = express.Router();

router.post("/create", createCar);
router.post("/activate", activateCar);

export default router;
