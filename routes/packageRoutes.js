import express from "express";
import {
  createPackage,
  updatePackageHandler,
  deactivatePackageHandler
} from "../services/packageService.js";

const router = express.Router();

router.post(
  "/create",
  createPackage
);

router.post(
  "/update",
  updatePackageHandler
);

router.post(
  "/deactivate",
  deactivatePackageHandler
);

export default router;
