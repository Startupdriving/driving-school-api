import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { setInstructorAvailability } from "../services/instructorService.js";
import express from "express";
import {
  createStudent,
  activateStudent,
  deactivateStudent
} from "../services/studentService.js";

const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);
router.post("/instructor/availability", setInstructorAvailability);

router.post("/instructor/accept-offer", async (req, res) => {

  const { instructor_id, lesson_request_id } = req.body;

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // 1️⃣ Check if offer exists
    const offerCheck = await client.query(`
      SELECT *
      FROM instructor_pending_offers
      WHERE instructor_id = $1
      AND lesson_request_id = $2
    `,[instructor_id, lesson_request_id]);

    if (offerCheck.rows.length === 0) {
      throw new Error("offer_not_found");
    }

    // 2️⃣ Insert acceptance event
    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id
      )
      VALUES ($1,$2,'lesson_offer_accepted',$3)
    `,[
      uuidv4(),
      lesson_request_id,
      instructor_id
    ]);

    // 3️⃣ Remove all pending offers for this request
    await client.query(`
      DELETE FROM instructor_pending_offers
      WHERE lesson_request_id = $1
    `,[lesson_request_id]);

    await client.query("COMMIT");

    res.json({ status: "offer_accepted" });

  } catch (err) {

    await client.query("ROLLBACK");

    res.status(500).json({ error: err.message });

  } finally {

    client.release();

  }

});

export default router;
