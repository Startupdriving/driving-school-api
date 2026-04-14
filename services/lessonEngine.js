import { v4 as uuidv4 } from "uuid";
import { insertEvent } from "./eventStore.js";

// 🎯 CENTRAL LESSON CREATION ENGINE
export async function createLesson(client, {
  student_id,
  instructor_id,
  start_time,
  end_time,
  price = null
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
    INSERT INTO identity (id, identity_type)
    VALUES ($1, 'lesson')
  `, [lessonId]);

 

 // 🧠 STEP 4 — INSERT EVENT
const startIso = new Date(start_time).toISOString();
const endIso = new Date(end_time).toISOString();

await insertEvent(client, {
  id: lessonId,
  identity_id: lessonId,
  event_type: "lesson_scheduled",
  payload: {
    student_id,
    instructor_id,
    start_time: startIso,
    end_time: endIso,
    price
  },
  instructor_id,
  lesson_range: `[${startIso},${endIso})`
});

  // 🧠 STEP 5 — UPSERT SCHEDULE PROJECTION
  await client.query(`
    INSERT INTO lesson_schedule_projection (
      lesson_request_id,
      instructor_id,
      student_id,
      start_time,
      end_time,
      status,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,'confirmed',NOW(),NOW())
    ON CONFLICT (lesson_request_id)
    DO UPDATE SET
      instructor_id = EXCLUDED.instructor_id,
      student_id = EXCLUDED.student_id,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = 'confirmed',
      updated_at = NOW()
  `, [
    lessonId,
    instructor_id,
    student_id,
    start_time,
    end_time
  ]);

  // 🧠 STEP 6 — UPDATE STUDENT STATE
  await client.query(`
    INSERT INTO student_active_lesson_projection (
      student_id,
      lesson_request_id,
      lesson_id,
      status,
      instructor_id,
      confirmed_at,
      updated_at
    )
    VALUES ($1, $2, $3, 'confirmed', $4, NOW(), NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
      lesson_id = EXCLUDED.lesson_id,
      instructor_id = EXCLUDED.instructor_id,
      status = 'confirmed',
      confirmed_at = NOW(),
      updated_at = NOW()
  `, [
    student_id,
    lessonId,
    lessonId,
    instructor_id
  ]);

  return lessonId;
}
