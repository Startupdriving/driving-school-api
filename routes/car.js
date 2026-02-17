import express from "express";
import {
  createCar,
  activateCar,
  setCarAvailability
} from "../services/carService.js";

const router = express.Router();

router.post("/create", createCar);
router.post("/activate", activateCar);
router.post("/availability", setCarAvailability);

export default router;

