import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import {
  emitToStudent,
  emitToInstructor
} from "../services/wsService.js";
import { handleEvent } from "../services/eventHandler.js";

const router = express.Router();

/* =====================================================
   POST /reschedule/request
===================================================== */

router.post("/request", async (req, res) => {
  const {
    lesson_id,
    actor, // student | instructor | admin
    actor_id,
    proposed_start_time,
    proposed_end_time,
    reason = null
  } = req.body;

  if (
    !lesson_id ||
    !actor ||
    !proposed_start_time ||
    !proposed_end_time
  ) {
    return res.status(400).json({
      error: "missing_fields"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -----------------------------------------------
       1. Load live lesson
    ----------------------------------------------- */

    const lessonRes = await client.query(`
      SELECT *
      FROM lesson_schedule_projection
      WHERE lesson_request_id = $1
      LIMIT 1
    `, [lesson_id]);

    if (lessonRes.rowCount === 0) {
      throw new Error("lesson_not_found");
    }

    const lesson = lessonRes.rows[0];

    if (lesson.status !== "confirmed") {
      throw new Error("only_confirmed_lessons_can_reschedule");
    }

    /* -----------------------------------------------
       2. Validate time
    ----------------------------------------------- */

    const start = new Date(proposed_start_time);
    const end = new Date(proposed_end_time);

    if (end <= start) {
      throw new Error("invalid_time_range");
    }

    /* -----------------------------------------------
       3. Instructor overlap check
    ----------------------------------------------- */

    const conflict = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE instructor_id = $1
        AND lesson_request_id <> $2
        AND status IN ('confirmed','started')
        AND tstzrange(start_time,end_time,'[)') &&
            tstzrange($3::timestamptz,$4::timestamptz,'[)')
      LIMIT 1
    `, [
      lesson.instructor_id,
      lesson_id,
      proposed_start_time,
      proposed_end_time
    ]);

    if (conflict.rowCount > 0) {
      throw new Error("instructor_time_conflict");
    }

    /* -----------------------------------------------
       4. Event insert
    ----------------------------------------------- */

    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload
      )
      VALUES ($1,$2,'lesson_reschedule_requested',$3)
    `, [
      uuidv4(),
      lesson_id,
      JSON.stringify({
        lesson_id,
        requested_by: actor,
        requested_by_id: actor_id,
        proposed_start_time,
        proposed_end_time,
        reason
      })
    ]);

    /* -----------------------------------------------
       5. Upsert projection
    ----------------------------------------------- */

    await client.query(`
      INSERT INTO lesson_reschedule_projection (
        lesson_id,
        requested_by,
        requested_by_id,
        current_start_time,
        current_end_time,
        proposed_start_time,
        proposed_end_time,
        reason,
        status,
        expires_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        'pending',
        NOW() + INTERVAL '2 hours'
      )
      ON CONFLICT (lesson_id)
      DO UPDATE SET
        requested_by = EXCLUDED.requested_by,
        requested_by_id = EXCLUDED.requested_by_id,
        current_start_time = EXCLUDED.current_start_time,
        current_end_time = EXCLUDED.current_end_time,
        proposed_start_time = EXCLUDED.proposed_start_time,
        proposed_end_time = EXCLUDED.proposed_end_time,
        reason = EXCLUDED.reason,
        status = 'pending',
        response_by = NULL,
        responded_at = NULL,
        expires_at = NOW() + INTERVAL '2 hours'
    `, [
      lesson_id,
      actor,
      actor_id,
      lesson.start_time,
      lesson.end_time,
      proposed_start_time,
      proposed_end_time,
      reason
    ]);

    await client.query("COMMIT");

    /* -----------------------------------------------
       6. Notify both sides
    ----------------------------------------------- */

    emitToStudent(lesson.student_id, {
      type: "lesson_reschedule_requested",
      lesson_id
    });

    emitToInstructor(lesson.instructor_id, {
      type: "lesson_reschedule_requested",
      lesson_id
    });

    res.json({
      status: "pending"
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

/* =====================================================
   POST /reschedule/respond
===================================================== */

router.post("/respond", async (req, res) => {
  const {
    lesson_id,
    actor,     // student | instructor | admin
    action     // accept | reject
  } = req.body;

  if (!lesson_id || !actor || !action) {
    return res.status(400).json({
      error: "missing_fields"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rs = await client.query(`
      SELECT *
      FROM lesson_reschedule_projection
      WHERE lesson_id = $1
      LIMIT 1
    `, [lesson_id]);

    if (rs.rowCount === 0) {
      throw new Error("reschedule_not_found");
    }

    const row = rs.rows[0];

    if (row.status !== "pending") {
      throw new Error("reschedule_not_pending");
    }

    const lessonRes = await client.query(`
      SELECT *
      FROM lesson_schedule_projection
      WHERE lesson_request_id = $1
      LIMIT 1
    `, [lesson_id]);

    if (lessonRes.rowCount === 0) {
      throw new Error("lesson_not_found");
    }

    const lesson = lessonRes.rows[0];

    /* -----------------------------------------------
       ACCEPT
    ----------------------------------------------- */

    if (action === "accept") {

  // 1️⃣ Lock row
  const { rows } = await client.query(`
    SELECT *
    FROM lesson_reschedule_projection
    WHERE lesson_id = $1
    FOR UPDATE
  `, [lesson_id]);

  if (!rows.length) {
    throw new Error("reschedule_not_found");
  }

  const row = rows[0];

  if (row.status !== "pending") {
    throw new Error("reschedule_not_pending");
  }

  // 2️⃣ Build event object
  const event = {
    id: uuidv4(),
    identity_id: lesson_id,
    event_type: "lesson_reschedule_accepted",
    payload: { lesson_id }
  };

  // 3️⃣ INSERT EVENT
  await client.query(`
    INSERT INTO event (id, identity_id, event_type, payload)
    VALUES ($1,$2,$3,$4)
  `, [
    event.id,
    event.identity_id,
    event.event_type,
    JSON.stringify(event.payload)
  ]);

  // 4️⃣ PROCESS EVENT (CRITICAL FIX)
  await handleEvent(client, event);

  // 5️⃣ COMMIT AFTER handler (so projection updates are included)
  await client.query("COMMIT");

  // 6️⃣ Emit realtime updates
  emitToStudent(lesson.student_id, {
    type: "lesson_rescheduled",
    lesson_id
  });

  emitToInstructor(lesson.instructor_id, {
    type: "lesson_rescheduled",
    lesson_id
  });

  return res.json({ status: "accepted" });
}

    /* -----------------------------------------------
       REJECT
    ----------------------------------------------- */

    await client.query(`
      UPDATE lesson_reschedule_projection
      SET status = 'rejected',
          response_by = $1,
          responded_at = NOW()
      WHERE lesson_id = $2
    `, [actor, lesson_id]);

    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload
      )
      VALUES ($1,$2,'lesson_reschedule_rejected',$3)
    `, [
      uuidv4(),
      lesson_id,
      JSON.stringify({ lesson_id })
    ]);

    await client.query("COMMIT");

    emitToStudent(lesson.student_id, {
      type: "lesson_reschedule_rejected",
      lesson_id
    });

    emitToInstructor(lesson.instructor_id, {
      type: "lesson_reschedule_rejected",
      lesson_id
    });

    res.json({
      status: "rejected"
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
