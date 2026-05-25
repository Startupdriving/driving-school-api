import { v4 as uuidv4 } from "uuid";
import { insertEvent } from "./eventStore.js";

// 🧠 CENTRAL LESSON CREATION ENGINE
export async function createLesson(client, {
  lesson_request_id,
  student_id,
  instructor_id,
  start_time,
  end_time,
  price,

  parent_event_id,
    correlation_id
}) {

  // 🧠 STEP 1 — OVERLAP CHECK
  const overlapCheck = await client.query(`
    SELECT 1
    FROM lesson_schedule_projection
    WHERE instructor_id = $1
      AND status IN ('confirmed', 'started')
      AND tstzrange(start_time, end_time, '[)') &&
          tstzrange($2::timestamptz, $3::timestamptz, '[)')
    LIMIT 1
  `, [instructor_id, start_time, end_time]);

  if (overlapCheck.rowCount > 0) {
    throw new Error("Instructor already booked for this time");
  }

  // 🧠 STEP 2 — CREATE LESSON ID
  const lessonId = uuidv4();

  // 🧠 STEP 3 — CREATE IDENTITY
  await client.query(`
    INSERT INTO identity (
      id,
      identity_type
    )
    VALUES ($1, 'lesson')
  `, [lessonId]);

  // 🧠 STEP 4 — INSERT EVENT ONLY
  const startIso = new Date(start_time).toISOString();
  const endIso = new Date(end_time).toISOString();

  await insertEvent(client, {
    id: lessonId,

    identity_id: lessonId,

    event_type: "lesson_created",

   correlation_id,
   causation_id:
   parent_event_id,


    payload: {
      lesson_request_id,
      student_id,
      instructor_id,
      start_time: startIso,
      end_time: endIso,
      price
    },

    instructor_id,

    lesson_range: `[${startIso},${endIso})`
  });

  // 🧠 IMPORTANT:
  // Projections are now owned ONLY by eventHandler.js
  // DO NOT mutate projections here anymore.

  return lessonId;
}
