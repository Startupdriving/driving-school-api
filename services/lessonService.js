import pool from "../db.js";
import crypto from "crypto";

function generateUUID() {
  return crypto.randomUUID();
}

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function scheduleLesson(req, res) {
  const {
    student_id,
    instructor_id,
    car_id,
    start_time,
    end_time
  } = req.body;

  if (!student_id || !instructor_id || !car_id || !start_time || !end_time) {
    return res.status(400).json({ error: "All fields required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Validate active student
    const studentCheck = await client.query(
      `SELECT 1 FROM current_active_students WHERE id = $1`,
      [student_id]
    );

    if (studentCheck.rowCount === 0) {
      throw new Error("Student not active");
    }

    // 2️⃣ Validate active instructor
    const instructorCheck = await client.query(
      `SELECT 1 FROM current_active_instructors WHERE id = $1`,
      [instructor_id]
    );

    if (instructorCheck.rowCount === 0) {
      throw new Error("Instructor not active");
    }

    // 3️⃣ Validate active car
    const carCheck = await client.query(
      `SELECT 1 FROM current_active_cars WHERE id = $1`,
      [car_id]
    );

    if (carCheck.rowCount === 0) {
      throw new Error("Car not active");
    }

    // 4️⃣ Check instructor overlap
    const instructorConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
      AND (e.payload->>'instructor_id')::uuid = $1
      AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
          AND c.event_type = 'lesson_cancelled'
      )
      AND (
        $2::timestamptz < (e.payload->>'end_time')::timestamptz
        AND
        $3::timestamptz > (e.payload->>'start_time')::timestamptz
      )
      `,
      [instructor_id, start_time, end_time]
    );

    if (instructorConflict.rowCount > 0) {
      throw new Error("Instructor already booked for this time");
    }

    // 5️⃣ Check car overlap
    const carConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
      AND (e.payload->>'car_id')::uuid = $1
      AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
          AND c.event_type = 'lesson_cancelled'
      )
      AND (
        $2::timestamptz < (e.payload->>'end_time')::timestamptz
        AND
        $3::timestamptz > (e.payload->>'start_time')::timestamptz
      )
      `,
      [car_id, start_time, end_time]
    );

    if (carConflict.rowCount > 0) {
      throw new Error("Car already booked for this time");
    }

    // 6️⃣ Create lesson identity
    const lessonId = generateUUID();

    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'lesson')`,
      [lessonId]
    );

    // 7️⃣ Insert lesson_scheduled event
    await client.query(
      `
      INSERT INTO event (id, identity_id, event_type, payload)
      VALUES ($1, $2, 'lesson_scheduled', $3::jsonb)
      `,
      [
        generateUUID(),
        lessonId,
        JSON.stringify({
          student_id,
          instructor_id,
          car_id,
          start_time,
          end_time
        })
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Lesson scheduled successfully",
      lesson_id: lessonId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function cancelLesson(req, res) {
  const { lesson_id } = req.body;

  if (!lesson_id) {
    return res.status(400).json({ error: "lesson_id is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if lesson exists
    const lessonCheck = await client.query(
      `SELECT 1 FROM identity 
       WHERE id = $1 AND identity_type = 'lesson'`,
      [lesson_id]
    );

    if (lessonCheck.rowCount === 0) {
      throw new Error("Lesson not found");
    }

    // Insert cancellation event
    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'lesson_cancelled', '{}'::jsonb)`,
      [crypto.randomUUID(), lesson_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Lesson cancelled" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function completeLesson(req, res) {
  const { lesson_id } = req.body;

  if (!lesson_id) {
    return res.status(400).json({ error: "lesson_id is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const lessonCheck = await client.query(
      `SELECT 1 FROM identity 
       WHERE id = $1 AND identity_type = 'lesson'`,
      [lesson_id]
    );

    if (lessonCheck.rowCount === 0) {
      throw new Error("Lesson not found");
    }

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'lesson_completed', '{}'::jsonb)`,
      [crypto.randomUUID(), lesson_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Lesson completed" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}
