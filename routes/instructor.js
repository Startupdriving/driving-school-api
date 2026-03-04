import { updateInstructorLocation } from "../services/instructorLocationService.js";
import db from "../db.js";
import {
  goOnline,
  goOffline,
  pauseInstructor,
  resumeInstructor
} from "../services/instructorService.js";

import express from "express";
import {
  createInstructor,
  activateInstructor
} from "../services/instructorService.js";

const router = express.Router();

router.post("/create", createInstructor);
router.post("/activate", activateInstructor);
router.post("/go-online", goOnline);
router.post("/go-offline", goOffline);
router.post("/pause", pauseInstructor);
router.post("/resume", resumeInstructor);
router.post("/location", async (req, res) => {

  const { instructor_id, lat, lng } = req.body;

  const client = await db.connect();

  try {

    await client.query("BEGIN");

    await updateInstructorLocation(
      client,
      instructor_id,
      lat,
      lng
    );

    await client.query("COMMIT");

    res.json({ status: "location_updated" });

  } catch (err) {

    await client.query("ROLLBACK");

    res.status(500).json({ error: err.message });

  } finally {

    client.release();

  }

});

export default router;
