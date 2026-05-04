import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

import {
  emitToInstructor,
  emitToStudent
} from "../services/wsService.js";

import {
  findStudentByLesson
} from "../services/studentProjectionHelpers.js";

import {
  updateStudentState
} from "../services/studentProjectionWriter.js";

import {
  scheduleLesson,
  rescheduleLesson
} from "../services/lessonService.js";

const router = express.Router();

/* =====================================================
   PASS-THROUGH ROUTES
===================================================== */

router.post("/schedule", scheduleLesson);
router.post("/reschedule", rescheduleLesson);

/* =====================================================
   HELPERS
===================================================== */

function requireFields(res, lesson_id, instructor_id) {
  if (!lesson_id || !instructor_id) {
    res.status(400).json({
      error: "lesson_id and instructor_id required"
    });
    return false;
  }

  return true;
}

// legacy bridge:
// lesson_schedule_projection column still named lesson_request_id
function legacyLessonKey(lesson_id) {
  return lesson_id;
}

async function beginTx() {
  const client = await pool.connect();
  await client.query("BEGIN");
  return client;
}

async function rollback(client, err, label, res) {
  await client.query("ROLLBACK");
  console.error(`${label} ERROR:`, err);

  res.status(400).json({
    error: err.message
  });
}

async function commit(client) {
  await client.query("COMMIT");
  client.release();
}

/* =====================================================
   START LESSON
===================================================== */

router.post("/start", async (req, res) => {
  const { lesson_id, instructor_id } = req.body;

  if (!requireFields(res, lesson_id, instructor_id)) return;

  const lesson_request_id = legacyLessonKey(lesson_id);

  const client = await beginTx();

  try {
    // Must exist as lesson entity
    const lessonCheck = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_created'
      LIMIT 1
    `, [lesson_id]);

    if (lessonCheck.rowCount === 0) {
      throw new Error("lesson_created_missing");
    }

    // Must be confirmed for this instructor
    const confirmed = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE lesson_request_id = $1
        AND instructor_id = $2
        AND status = 'confirmed'
      LIMIT 1
    `, [lesson_request_id, instructor_id]);

    if (confirmed.rowCount === 0) {
      throw new Error("lesson_not_confirmed");
    }

    // Prevent duplicate start
    const alreadyStarted = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE lesson_request_id = $1
        AND status = 'started'
      LIMIT 1
    `, [lesson_request_id]);

    if (alreadyStarted.rowCount > 0) {
      throw new Error("lesson_already_started");
    }

    // Global instructor active lock
    const activeLesson = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE instructor_id = $1
        AND status = 'started'
      LIMIT 1
    `, [instructor_id]);

    if (activeLesson.rowCount > 0) {
      throw new Error("instructor_already_has_active_lesson");
    }

    // Insert event
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
      JSON.stringify({ lesson_id })
    ]);

    const eventTime = rows[0].created_at;

    // Projection
    await client.query(`
      UPDATE lesson_schedule_projection
      SET status = 'started',
          updated_at = NOW()
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    // Student projection
    const studentId = await findStudentByLesson(client, lesson_id);

    if (studentId) {
      await updateStudentState(client, studentId, {
        status: "started",
        started_at: eventTime,
        completed_at: null,
        cancelled_at: null
      });
    }

    await commit(client);

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });


    console.log("EMIT STUDENT:", studentId, "lesson_started");

    if (studentId) {
      emitToStudent(studentId, {
        type: "student_update"
      });
    }

    res.json({
      status: "lesson_started"
    });

  } catch (err) {
    client.release();
    return rollback(client, err, "START", res);
  }
});

/* =====================================================
   COMPLETE LESSON
===================================================== */

router.post("/complete", async (req, res) => {
  const { lesson_id, instructor_id } = req.body;

  if (!requireFields(res, lesson_id, instructor_id)) return;

  const lesson_request_id = legacyLessonKey(lesson_id);

  const client = await beginTx();

  try {
    // Must have started
    const started = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_started'
      LIMIT 1
    `, [lesson_id]);

    if (started.rowCount === 0) {
      throw new Error("lesson_not_started");
    }

    // Prevent duplicate completion
    const completed = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_completed'
      LIMIT 1
    `, [lesson_id]);

    if (completed.rowCount > 0) {
      throw new Error("lesson_already_completed");
    }

    const { rows } = await client.query(`
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

    const eventTime = rows[0].created_at;

    await client.query(`
      UPDATE lesson_schedule_projection
      SET status = 'completed',
          updated_at = NOW()
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    const studentId = await findStudentByLesson(client, lesson_id);

    if (studentId) {
      await updateStudentState(client, studentId, {
        status: "completed",
        completed_at: eventTime,
        cancelled_at: null
      });
    }

    await commit(client);

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });

    if (studentId) {
      emitToStudent(studentId, {
        type: "student_update"
      });
    }

    res.json({
      status: "lesson_completed"
    });

  } catch (err) {
    client.release();
    return rollback(client, err, "COMPLETE", res);
  }
});

/* =====================================================
   CANCEL LESSON
===================================================== */

router.post("/cancel", async (req, res) => {
  const { lesson_id, instructor_id } = req.body;

  if (!requireFields(res, lesson_id, instructor_id)) return;

  const lesson_request_id = legacyLessonKey(lesson_id);

  const client = await beginTx();

  try {
    // Prevent complete -> cancel
    const completed = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_completed'
      LIMIT 1
    `, [lesson_id]);

    if (completed.rowCount > 0) {
      throw new Error("lesson_already_completed");
    }

    // Prevent duplicate cancel
    const cancelled = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_cancelled'
      LIMIT 1
    `, [lesson_id]);

    if (cancelled.rowCount > 0) {
      throw new Error("lesson_already_cancelled");
    }

    const { rows } = await client.query(`
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

    const eventTime = rows[0].created_at;

    await client.query(`
      UPDATE lesson_schedule_projection
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    const studentId = await findStudentByLesson(client, lesson_id);

    if (studentId) {
      await updateStudentState(client, studentId, {
        status: "cancelled",
        cancelled_at: eventTime,
        started_at: null,
        completed_at: null
      });
    }

    await commit(client);

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });

   console.log("EMIT STUDENT:", studentId, "lesson_cancelled");

    if (studentId) {
      emitToStudent(studentId, {
        type: "student_update"
      });
    }

    res.json({
      status: "lesson_cancelled"
    });

  } catch (err) {
    client.release();
    return rollback(client, err, "CANCEL", res);
  }
});

export default router;
