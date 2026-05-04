import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { emitToStudent, emitToInstructor } from "./wsService.js";
import { createLesson } from "./lessonEngine.js";
import { insertEvent } from "./eventStore.js";




function validateSlotRules(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // End after start
  if (end <= start) {
    throw new Error("invalid_time_range");
  }

  // Minimum notice = 1 hour
  const minStart = new Date(now.getTime() + 60 * 60 * 1000);
  if (start < minStart) {
    throw new Error("minimum_notice_required");
  }

  // Max future = 14 days
  const maxStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (start > maxStart) {
    throw new Error("booking_too_far");
  }

  // Duration minutes
  const durationMin = (end - start) / (1000 * 60);

  if (![60, 90].includes(durationMin)) {
    throw new Error("invalid_lesson_duration");
  }
}



export async function counterOffer(req, res) {
  const {
    offer_id,
    actor, // "student" | "instructor"
    proposed_start_time,
    proposed_end_time,
    proposed_price
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🧠 STEP 1 — LOCK ROW
    const { rows } = await client.query(`
      SELECT *
      FROM lesson_offer_negotiation_projection
      WHERE offer_id = $1
      FOR UPDATE
    `, [offer_id]);

    if (!rows.length) {
      throw new Error("offer_not_found");
    }

    const offer = rows[0];


   validateSlotRules(proposed_start_time, proposed_end_time);


    // 🧠 STEP 2 — VALIDATION

    if (['accepted', 'rejected'].includes(offer.status)) {
      throw new Error("offer_already_finalized");
    }

    if (offer.last_response_by === actor) {
      throw new Error("same_actor_cannot_counter_twice");
    }

    if (new Date(proposed_end_time) <= new Date(proposed_start_time)) {
      throw new Error("invalid_time_range");
    }

    // 🧠 STEP 3 — INSERT EVENT
await insertEvent(client, {
  id: uuidv4(),
  identity_id: offer_id,
  event_type: "lesson_offer_countered",
  payload: {
    offer_id,
    lesson_request_id: offer.lesson_request_id,
    actor,
    proposed_start_time,
    proposed_end_time,
    proposed_price
  }
});

    // 🧠 STEP 4 — UPDATE PROJECTION
    await client.query(`
      UPDATE lesson_offer_negotiation_projection
      SET
        proposed_start_time = $1,
        proposed_end_time = $2,
        proposed_price = $3,
        last_response_by = $4,
        status = 'countered',
        response_count = response_count + 1,
        updated_at = NOW()
      WHERE offer_id = $5
    `, [
      proposed_start_time,
      proposed_end_time,
      proposed_price,
      actor,
      offer_id
    ]);

    await client.query("COMMIT");

    res.json({ status: "countered" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("COUNTER ERROR:", err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}



export async function acceptOffer(req, res) {
  const { offer_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`
      SELECT *
      FROM lesson_offer_negotiation_projection
      WHERE offer_id = $1
      FOR UPDATE
    `, [offer_id]);

    if (!rows.length) throw new Error("offer_not_found");

    const offer = rows[0];

          // 🛑 DOUBLE ACCEPT GUARD
    if (['accepted', 'rejected'].includes(offer.status)) {
      throw new Error("offer_already_finalized");
     }


    validateSlotRules(
   offer.proposed_start_time,
   offer.proposed_end_time
   );

// 🛑 STOP stale / already resolved requests
const reqState = await client.query(`
  SELECT status
  FROM lesson_negotiation_projection
  WHERE lesson_request_id = $1
  LIMIT 1
`, [offer.lesson_request_id]);

if (
  reqState.rows.length &&
  reqState.rows[0].status !== 'pending'
) {
  throw new Error("request_not_pending");
}


    validateSlotRules(
   offer.proposed_start_time,
   offer.proposed_end_time
   );


// PostgreSQL dow style:
// Sunday=0 ... Saturday=6
/* const startDate = new Date(offer.proposed_start_time);
const endDate = new Date(offer.proposed_end_time);

const dayOfWeek = startDate.getDay(); // local weekday

const lessonTime = startDate.toLocaleTimeString("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const lessonEndTime = endDate.toLocaleTimeString("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

console.log("AVAIL CHECK", {
  instructor_id: offer.instructor_id,
  dayOfWeek,
  lessonTime,
  lessonEndTime
});


const availability = await client.query(`
  SELECT 1
  FROM event
  WHERE identity_id = $1
    AND event_type = 'instructor_availability_set'
    AND (payload->>'day_of_week')::int = $2
    AND (payload->>'start_time')::time <= $3::time
    AND (payload->>'end_time')::time >= $4::time
  ORDER BY created_at DESC
  LIMIT 1
`, [
  offer.instructor_id,
  dayOfWeek,
  lessonTime,
  lessonEndTime
]);

if (availability.rowCount === 0) {
  throw new Error("instructor_unavailable");
}

console.log("AVAIL ROWS:", availability.rows);
*/
    // ==================================================
// HARD CONFLICT PROTECTION
// ==================================================

// 3️⃣ Instructor conflict
const instructorConflict = await client.query(`
  SELECT 1
  FROM lesson_schedule_projection
  WHERE instructor_id = $1
    AND status IN ('confirmed','started')
    AND tstzrange(start_time, end_time, '[)') &&
        tstzrange($2::timestamptz, $3::timestamptz, '[)')
  LIMIT 1
`, [
  offer.instructor_id,
  offer.proposed_start_time,
  offer.proposed_end_time
]);

if (instructorConflict.rowCount > 0) {
  throw new Error("instructor_time_conflict");
}

// 4️⃣ Student conflict
const studentConflict = await client.query(`
  SELECT 1
  FROM lesson_schedule_projection
  WHERE student_id = $1
    AND status IN ('confirmed','started')
    AND tstzrange(start_time, end_time, '[)') &&
        tstzrange($2::timestamptz, $3::timestamptz, '[)')
  LIMIT 1
`, [
  offer.student_id,
  offer.proposed_start_time,
  offer.proposed_end_time
]);

if (studentConflict.rowCount > 0) {
  throw new Error("student_time_conflict");
}



let lessonId;

try {
 lessonId = await createLesson(client, {
  student_id: offer.student_id,
  instructor_id: offer.instructor_id,
  start_time: offer.proposed_start_time,
  end_time: offer.proposed_end_time,
  price: offer.proposed_price
});} catch (err) {
  console.error("LESSON ENGINE FAILED:", err);
  throw err;
}



    // 🧠 STEP 3 — UPDATE PROJECTION
    await client.query(`
      UPDATE lesson_offer_negotiation_projection
      SET
        status = 'accepted',
        updated_at = NOW()
      WHERE offer_id = $1
    `, [offer_id]);



    // 🧠 STEP 2 — INSERT EVENT
    await insertEvent(client, {
  id: uuidv4(),
  identity_id: offer_id,
  event_type: "lesson_offer_accepted",
  payload: {
    offer_id,
    lesson_request_id: offer.lesson_request_id,
    final_start_time: offer.proposed_start_time,
    final_end_time: offer.proposed_end_time,
    final_price: offer.proposed_price
 }
});


 // ❌ CANCEL ALL OTHER OFFERS
 await client.query(`
  UPDATE lesson_offer_negotiation_projection
  SET status = 'rejected', updated_at = NOW()
  WHERE lesson_request_id = $1
    AND offer_id != $2
 `, [
  offer.lesson_request_id,
  offer_id
 ]);

    await client.query("COMMIT");


   emitToStudent(offer.student_id, {
  type: "lesson_confirmed",
  lesson_id: lessonId
});

emitToInstructor(offer.instructor_id, {
  type: "lesson_assigned",
  lesson_id: lessonId
});


    res.json({
  status: "accepted",
  lesson_id: lessonId
});

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT ERROR:", err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}



export async function rejectOffer(req, res) {
  const { offer_id, actor } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`
      SELECT *
      FROM lesson_offer_negotiation_projection
      WHERE offer_id = $1
      FOR UPDATE
    `, [offer_id]);

    if (!rows.length) throw new Error("offer_not_found");

    const offer = rows[0];

    if (['accepted', 'rejected'].includes(offer.status)) {
      throw new Error("already_finalized");
    }

    // 🧠 EVENT
    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload
      )
      VALUES ($1, $2, 'lesson_offer_rejected', $3)
    `, [
      uuidv4(),
      offer_id,
      JSON.stringify({
        offer_id,
        lesson_request_id: offer.lesson_request_id,
        rejected_by: actor
      })
    ]);

    // 🧠 PROJECTION
    await client.query(`
      UPDATE lesson_offer_negotiation_projection
      SET
        status = 'rejected',
        updated_at = NOW()
      WHERE offer_id = $1
    `, [offer_id]);

    await client.query("COMMIT");

    res.json({ status: "rejected" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("REJECT ERROR:", err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}
