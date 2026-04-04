import { rebuildProjections } from "../services/projectionRebuildService.js";
import express from "express";
import pool from "../db.js";
import { emitToInstructor } from "../services/wsService.js";
import { v4 as uuidv4 } from "uuid";
import {
  scheduleLesson,
  cancelLesson,
  completeLesson,
  rescheduleLesson
} from "../services/lessonService.js";


const router = express.Router();

router.post("/schedule", scheduleLesson);
router.post("/reschedule", rescheduleLesson);



router.post("/start", async (req, res) => {

  const { lesson_id, instructor_id } = req.body;

  console.log("START BODY:", req.body); // ✅ correct debug

  if (!lesson_id || !instructor_id) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // STEP 1 — GET lesson_request_id FROM lesson
    const lessonResult = await client.query(`
      SELECT payload
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_created'
      LIMIT 1
    `, [lesson_id]);

    if (lessonResult.rows.length === 0) {
      throw new Error("lesson_not_found");
    }

    const lesson_request_id =
      lessonResult.rows[0].payload.lesson_request_id;

    // STEP 2 — CHECK CONFIRMATION (ON REQUEST)
    const confirmed = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_confirmed'
      LIMIT 1
    `, [lesson_request_id]);

    if (confirmed.rows.length === 0) {
      throw new Error("lesson_not_confirmed");
    }

    // STEP 3 — CHECK ALREADY STARTED (ON LESSON)
    const started = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_started'
      LIMIT 1
    `, [lesson_id]);

    if (started.rows.length > 0) {
      throw new Error("lesson_already_started");
    }

    // STEP 4 — INSERT START EVENT
    await client.query(`
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES ($1,$2,'lesson_started',$3,$4)
`, [
  uuidv4(),
  lesson_id,
  instructor_id,
  JSON.stringify({
    lesson_request_id
  })
]);



    await client.query("COMMIT");



    emitToInstructor(instructor_id, {
    type: "dashboard_update"
    });

    rebuildProjections().catch(console.error);

    res.json({ status: "lesson_started" });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error("START ERROR:", err);

    res.status(400).json({ error: err.message });

  } finally {

    client.release();

  }
});




router.post("/complete", async (req, res) => {


  const { lesson_id, instructor_id } = req.body;

  if (!lesson_id || !instructor_id) {
    return res.status(400).json({
      error: "lesson_id and instructor_id required"
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Must have started
    const { rows } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_started'
      LIMIT 1
    `,[lesson_id]);

    if (rows.length === 0) {
      throw new Error("lesson_not_started");
    }

    // Prevent duplicate completion
    const { rows: completed } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_completed'
      LIMIT 1
    `,[lesson_id]);

    if (completed.length > 0) {
      throw new Error("lesson_already_completed");
    }

    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id
      )
      VALUES ($1,$2,'lesson_completed',$3)
    `,[
      uuidv4(),
      lesson_id,
      instructor_id
    ]);

    await client.query("COMMIT");


   emitToInstructor(instructor_id, {
   type: "dashboard_update"
   });

    await rebuildProjections();

    res.json({
      status: "lesson_completed"
    });

  } catch (err) {

  await client.query("ROLLBACK");

  console.error("COMPLETE ERROR:", err);   // ✅ FIXED

  res.status(400).json({
    error: err.message
  });


  } finally {

    client.release();

  }

});





router.post("/cancel", async (req, res) => {

  const { lesson_id, instructor_id } = req.body;

  if (!lesson_id || !instructor_id) {
    return res.status(400).json({
      error: "lesson_id and instructor_id required"
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // ❌ Prevent cancel after completion
    const { rows: completed } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_completed'
      LIMIT 1
    `, [lesson_id]);

    if (completed.length > 0) {
      throw new Error("lesson_already_completed");
    }

    // ❌ Prevent duplicate cancel
    const { rows: cancelled } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_cancelled'
      LIMIT 1
    `, [lesson_id]);

    if (cancelled.length > 0) {
      throw new Error("lesson_already_cancelled");
    }

    // ✅ Insert cancel event
    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id
      )
      VALUES ($1,$2,'lesson_cancelled',$3)
    `, [
      uuidv4(),
      lesson_id,
      instructor_id
    ]);



    await client.query("COMMIT");


    emitToInstructor(instructor_id, {
    type: "dashboard_update"
    });


    await rebuildProjections();

    res.json({
      status: "lesson_cancelled"
    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error("CANCEL ERROR:", err);

    res.status(400).json({
      error: err.message
    });

  } finally {

    client.release();

  }

});




export default router;

