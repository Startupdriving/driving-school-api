import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import {
  scheduleLesson,
  cancelLesson,
  completeLesson,
  rescheduleLesson
} from "../services/lessonService.js";


const router = express.Router();

router.post("/schedule", scheduleLesson);
router.post("/cancel", cancelLesson);
router.post("/complete", completeLesson);
router.post("/reschedule", rescheduleLesson);

router.post("/start", async (req, res) => {

  const { lesson_request_id, instructor_id } = req.body;

  if (!lesson_request_id || !instructor_id) {
    return res.status(400).json({
      error: "lesson_request_id and instructor_id required"
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Verify lesson confirmed
    const { rows } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_confirmed'
      LIMIT 1
    `,[lesson_request_id]);

    if (rows.length === 0) {
      throw new Error("lesson_not_confirmed");
    }

    // Prevent duplicate start
    const { rows: started } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_started'
      LIMIT 1
    `,[lesson_request_id]);

    if (started.length > 0) {
      throw new Error("lesson_already_started");
    }

    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id
      )
      VALUES ($1,$2,'lesson_started',$3)
    `,[
      uuidv4(),
      lesson_request_id,
      instructor_id
    ]);

    await client.query("COMMIT");

    res.json({
      status: "lesson_started"
    });

  } catch (err) {

    await client.query("ROLLBACK");

    res.status(400).json({
      error: err.message
    });

  } finally {

    client.release();

  }

});

export default router;

