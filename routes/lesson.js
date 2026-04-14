import { rebuildProjections } from "../services/projectionRebuildService.js";
import express from "express";
import db from '../db.js';
import pool from "../db.js";
import { emitToInstructor, emitToStudent } from "../services/wsService.js";
import { v4 as uuidv4 } from "uuid";
import { findStudentByLesson } from '../services/studentProjectionHelpers.js';
import { updateStudentState } from '../services/studentProjectionWriter.js';
import { scheduleLesson, cancelLesson, completeLesson, rescheduleLesson } from "../services/lessonService.js";


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


// 🚨 STEP 3.5 — GLOBAL ACTIVE LESSON LOCK (PROJECTION-BASED)

console.log("🔒 CHECKING ACTIVE LESSON LOCK");

const activeLesson = await client.query(`
  SELECT 1
  FROM lesson_schedule_projection
  WHERE instructor_id = $1
    AND status = 'started'
  LIMIT 1
`, [instructor_id]);

console.log("🔍 ACTIVE LESSON RESULT:", activeLesson.rows);

if (activeLesson.rowCount > 0) {
  console.log("⛔ ACTIVE LESSON LOCK BLOCKED", {
    instructor_id
  });

  throw new Error("Instructor already has an active lesson");
}


    // STEP 4 — INSERT START EVENT (WITH DB TIME)
const { rows } = await client.query(`
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES ($1,$2,'lesson_started',$3,$4)
  RETURNING created_at
`, [
  uuidv4(),
  lesson_id,
  instructor_id,
  JSON.stringify({
    lesson_request_id
  })
]);

const eventTime = rows[0].created_at;


// 🧠 UPDATE SCHEDULE PROJECTION → started

await client.query(`
  UPDATE lesson_schedule_projection
  SET status = 'started',
      updated_at = NOW()
  WHERE lesson_request_id = $1
`, [lesson_id]);

console.log("✅ SCHEDULE STATUS → STARTED:", lesson_id);


// ✅ STUDENT PROJECTION UPDATE (started)
const studentId = await findStudentByLesson(client, lesson_id);

console.log("🔥 STARTED HOOK:", studentId);

if (studentId) {
  await updateStudentState(client, studentId, {
    status: 'started',
    started_at: eventTime,
 // 🔥 CLEAN INVALID FIELDS
    completed_at: null,
    cancelled_at: null
  });
}

    await client.query("COMMIT");

    emitToStudent(studentId, { type: "student_update" });

    emitToInstructor(instructor_id, {
    type: "dashboard_update"
    });

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


     const { rows: insertRows } = await client.query(`
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES ($1,$2,'lesson_completed',$3,$4)
  RETURNING created_at
`, [
  uuidv4(),
  lesson_id,
  instructor_id,
  JSON.stringify({ lesson_id })
]);

     const eventTime = insertRows[0].created_at;



await client.query(`
  UPDATE lesson_schedule_projection
  SET status = 'completed',
      updated_at = NOW()
  WHERE lesson_request_id = $1
`, [lesson_id]);

console.log("✅ SCHEDULE STATUS → COMPLETED:", lesson_id);



    const studentId = await findStudentByLesson(client, lesson_id);

     if (studentId) {
     await updateStudentState(client, studentId, {
     status: 'completed',
     completed_at: eventTime,
     cancelled_at: null
     });
     }


    await client.query("COMMIT");

   emitToStudent(studentId, { type: "student_update" });


   emitToInstructor(instructor_id, {
   type: "dashboard_update"
   });


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
 const { rows: cancelRows } = await client.query(`
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES ($1,$2,'lesson_cancelled',$3,$4)
  RETURNING created_at
`, [
  uuidv4(),
  lesson_id,
  instructor_id,
  JSON.stringify({ lesson_id })
]);

const eventTime = cancelRows[0].created_at;


await client.query(`
  UPDATE lesson_schedule_projection
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE lesson_request_id = $1
`, [lesson_id]);



  // ✅ STUDENT PROJECTION UPDATE (cancelled)
const studentId = await findStudentByLesson(client, lesson_id);

console.log("🔥 CANCELLED HOOK:", studentId);

if (studentId) {
  await updateStudentState(client, studentId, {
  status: 'cancelled',
  cancelled_at: eventTime,

  // 🔥 CLEAR OLD EXECUTION DATA
  started_at: null,
  completed_at: null
});
}



    await client.query("COMMIT");


    emitToStudent(studentId, { type: "student_update" });

    emitToInstructor(instructor_id, {
    type: "dashboard_update"
    });

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

