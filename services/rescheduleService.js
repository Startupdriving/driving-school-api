import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import {
  emitToStudent,
  emitToInstructor
} from "./wsService.js";
import {
  assertTransition
} from "./lifecycleGuards.js";
import { insertEvent }
from "./eventStore.js";


/* =====================================================
   REQUEST RESCHEDULE
===================================================== */

export async function requestReschedule({
  lesson_id,
  actor,              // student | instructor | admin
  actor_id = null,
  proposed_start_time,
  proposed_end_time,
  reason = null
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -----------------------------------------------
       1. Load lesson
    ----------------------------------------------- */
const lessonQuery = await client.query(`
  SELECT
    status,
    instructor_id,
    student_id,
    start_time,
    end_time
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

if (lessonQuery.rowCount === 0) {
  throw new Error("lesson_not_found");
}

const lesson =
  lessonQuery.rows[0];

assertTransition(
  lesson.status,
  "reschedule_requested"
);

const ownsLesson =
  lesson.instructor_id === actor_id ||
  lesson.student_id === actor_id;

if (!ownsLesson) {
  throw new Error("lesson_not_owned");
}

const pendingReschedule =
  await client.query(`
    SELECT 1
    FROM lesson_reschedule_projection
    WHERE lesson_id = $1
      AND status = 'pending'
    LIMIT 1
`, [lesson_id]);

if (pendingReschedule.rowCount > 0) {
  throw new Error(
    "reschedule_already_pending"
  );
}
    /* -----------------------------------------------
       2. Validate time range
    ----------------------------------------------- */

    const start = new Date(proposed_start_time);
    const end = new Date(proposed_end_time);

    if (end <= start) {
      throw new Error("invalid_time_range");
    }

    if (start <= new Date()) {
      throw new Error("must_be_future_time");
    }

    /* -----------------------------------------------
       3. Instructor overlap check
    ----------------------------------------------- */

    const instructorConflict = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE instructor_id = $1
        AND lesson_id <> $2
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

    if (instructorConflict.rowCount > 0) {
      throw new Error("instructor_time_conflict");
    }

    /* -----------------------------------------------
       4. Student overlap check
    ----------------------------------------------- */

    const studentConflict = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE student_id = $1
        AND lesson_id <> $2
        AND status IN ('confirmed','started')
        AND tstzrange(start_time,end_time,'[)') &&
            tstzrange($3::timestamptz,$4::timestamptz,'[)')
      LIMIT 1
    `, [
      lesson.student_id,
      lesson_id,
      proposed_start_time,
      proposed_end_time
    ]);

    if (studentConflict.rowCount > 0) {
      throw new Error("student_time_conflict");
    }

    /* -----------------------------------------------
       5. Insert audit event
    ----------------------------------------------- */

    await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_reschedule_requested",

  payload: {

    lesson_id,

    requested_by:
      actor,

    requested_by_id:
      actor_id,

    current_start_time:
      lesson.start_time,

    current_end_time:
      lesson.end_time,

    proposed_start_time,

    proposed_end_time,

    reason

  }

});

    /* -----------------------------------------------
       6. Upsert projection
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
       7. Notify both parties
    ----------------------------------------------- */

    emitToStudent(lesson.student_id, {
      type: "lesson_reschedule_requested",
      lesson_id
    });

    emitToInstructor(lesson.instructor_id, {
      type: "lesson_reschedule_requested",
      lesson_id
    });

    return {
      status: "pending"
    };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* =====================================================
   RESPOND RESCHEDULE
===================================================== */

export async function respondReschedule({
  lesson_id,
  actor,       // student | instructor | admin
  action       // accept | reject
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -----------------------------------------------
       1. Load request
    ----------------------------------------------- */

    const rs = await client.query(`
      SELECT *
      FROM lesson_reschedule_projection
      WHERE lesson_id = $1
      LIMIT 1
    `, [lesson_id]);

    if (rs.rowCount === 0) {
      throw new Error("reschedule_not_found");
    }

    const req = rs.rows[0];

    if (req.status !== "pending") {
      throw new Error("reschedule_not_pending");
    }

    if (req.expires_at && new Date(req.expires_at) < new Date()) {
      throw new Error("reschedule_expired");
    }

    /* -----------------------------------------------
       2. Load lesson
    ----------------------------------------------- */

    const lessonRes = await client.query(`
      SELECT *
      FROM lesson_schedule_projection
      WHERE lesson_id = $1
         OR lesson_request_id = $1
      LIMIT 1
    `, [lesson_id]);

    if (lessonRes.rowCount === 0) {
      throw new Error("lesson_not_found");
    }

    const lesson = lessonRes.rows[0];

    assertTransition(
     lesson.status,
     "reschedule_requested"
    );



     const validActor =
     actor === "student" ||
     actor === "instructor" ||
     actor === "admin";

     if (!validActor) {
     throw new Error("invalid_actor");
     }


    /* -----------------------------------------------
       ACCEPT
    ----------------------------------------------- */

    if (action === "accept") {

      await client.query(`
        UPDATE lesson_reschedule_projection
        SET status = 'accepted',
            response_by = $1,
            responded_at = NOW()
        WHERE lesson_id = $2
      `, [actor, lesson_id]);


      await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_rescheduled",

  payload: {

    lesson_id,

    old_start_time:
      req.current_start_time,

    old_end_time:
      req.current_end_time,

    new_start_time:
      req.proposed_start_time,

    new_end_time:
      req.proposed_end_time,

    accepted_by:
      actor

  }

});

      await client.query("COMMIT");

      emitToStudent(lesson.student_id, {
        type: "lesson_reschedule_accepted",
        lesson_id
      });

      emitToInstructor(lesson.instructor_id, {
        type: "lesson_reschedule_accepted",
        lesson_id
      });

      return {
        status: "accepted"
      };
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

    await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_reschedule_rejected",

  payload: {

    lesson_id,

    rejected_by:
      actor

  }

});

    await client.query("COMMIT");

    emitToStudent(lesson.student_id, {
      type: "lesson_reschedule_rejected",
      lesson_id
    });

    emitToInstructor(lesson.instructor_id, {
      type: "lesson_reschedule_rejected",
      lesson_id
    });

    return {
      status: "rejected"
    };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
