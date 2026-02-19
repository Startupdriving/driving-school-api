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

  if (
    !isValidUUID(student_id) ||
    !isValidUUID(instructor_id) ||
    !isValidUUID(car_id)
  ) {
    return res.status(400).json({ error: "Invalid UUID format" });
  }

  const studentId = student_id;
  const instructorId = instructor_id;
  const carId = car_id;
  const startTime = start_time;
  const endTime = end_time;

  const payload = {
    student_id: studentId,
    instructor_id: instructorId,
    car_id: carId,
    start_time: startTime,
    end_time: endTime
  };

  const lessonId = generateUUID();

  const client = await pool.connect();

  const idempotencyKey = req.headers["idempotency-key"];

if (!idempotencyKey) {
  return res.status(400).json({ error: "Idempotency-Key header required" });
}



  try {
    await client.query("BEGIN");

await client.query("BEGIN");

// Attempt to insert idempotency key placeholder
const insertKey = await client.query(
  `
  INSERT INTO idempotency_key (key, response)
  VALUES ($1, '{}'::jsonb)
  ON CONFLICT (key) DO NOTHING
  RETURNING key
  `,
  [idempotencyKey]
);

if (insertKey.rowCount === 0) {
  // Key already exists → fetch stored response
  const existing = await client.query(
    `SELECT response FROM idempotency_key WHERE key = $1`,
    [idempotencyKey]
  );

  await client.query("ROLLBACK");
  return res.json(existing.rows[0].response);
}



    // 1️⃣ Validate active student
    const studentCheck = await client.query(
      `SELECT 1 FROM current_active_students WHERE id = $1`,
      [studentId]
    );
    if (studentCheck.rowCount === 0) {
      throw new Error("Student not active");
    }

    // 2️⃣ Validate active instructor
    const instructorCheck = await client.query(
      `SELECT 1 FROM current_active_instructors WHERE id = $1`,
      [instructorId]
    );
    if (instructorCheck.rowCount === 0) {
      throw new Error("Instructor not active");
    }

    // 3️⃣ Validate active car
    const carCheck = await client.query(
      `SELECT 1 FROM current_active_cars WHERE id = $1`,
      [carId]
    );
    if (carCheck.rowCount === 0) {
      throw new Error("Car not active");
    }

    // 4️⃣ Instructor availability
    const instructorAvailability = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.identity_id = $1
        AND e.event_type = 'instructor_availability_set'
        AND (e.payload->>'day_of_week')::int = EXTRACT(DOW FROM $2::timestamptz)
        AND $3::time >= (e.payload->>'start_time')::time
        AND $4::time <= (e.payload->>'end_time')::time
      `,
      [
        instructorId,
        startTime,
        startTime.split("T")[1].substring(0, 5),
        endTime.split("T")[1].substring(0, 5)
      ]
    );
    if (instructorAvailability.rowCount === 0) {
      throw new Error("Instructor not available during requested time");
    }

    // 5️⃣ Car availability
    const carAvailability = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.identity_id = $1
        AND e.event_type = 'car_availability_set'
        AND (e.payload->>'day_of_week')::int = EXTRACT(DOW FROM $2::timestamptz)
        AND $3::time >= (e.payload->>'start_time')::time
        AND $4::time <= (e.payload->>'end_time')::time
      `,
      [
        carId,
        startTime,
        startTime.split("T")[1].substring(0, 5),
        endTime.split("T")[1].substring(0, 5)
      ]
    );
    if (carAvailability.rowCount === 0) {
      throw new Error("Car not available during requested time");
    }

    // 6️⃣ Instructor daily capacity limit (max 3 lessons per day)

    const dailyCount = await client.query(
      `
      SELECT COUNT(*) AS total
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.instructor_id = $1
        AND DATE(lower(e.lesson_range)) = DATE($2::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [instructorId, startTime]
    );

    const lessonCount = parseInt(dailyCount.rows[0].total, 10);

    if (lessonCount >= 3) {
      throw new Error("Instructor daily lesson limit reached");
    }


    // 6️⃣ Instructor overlap (using indexed columns)
    const instructorConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.instructor_id = $1
        AND e.lesson_range && tstzrange($2::timestamptz, $3::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [instructorId, startTime, endTime]
    );

    if (instructorConflict.rowCount > 0) {
      throw new Error("Instructor already booked for this time");
    }

    // 7️⃣ Car overlap (using indexed columns)
    const carConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.car_id = $1
        AND e.lesson_range && tstzrange($2::timestamptz, $3::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [carId, startTime, endTime]
    );

    if (carConflict.rowCount > 0) {
      throw new Error("Car already booked for this time");
    }

    // 8️⃣ Create lesson identity
    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'lesson')`,
      [lessonId]
    );

    // 9️⃣ Insert lesson_scheduled event (indexed columns populated)
    await client.query(
      `
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload,
        instructor_id,
        car_id,
        lesson_range
      )
      VALUES (
        $1,
        $1,
        'lesson_scheduled',
        $2,
        $3,
        $4,
        tstzrange($5::timestamptz, $6::timestamptz)
      )
      `,
      [
        lessonId,
        payload,
        instructorId,
        carId,
        startTime,
        endTime
      ]
    );

    const responseBody = {
  message: "Lesson scheduled successfully",
  lesson_id: lessonId
};

// Update stored idempotency response
await client.query(
  `
  UPDATE idempotency_key
  SET response = $2
  WHERE key = $1
  `,
  [idempotencyKey, responseBody]
);

await client.query("COMMIT");

res.status(201).json(responseBody);


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
       VALUES ($1, $2, 'lesson_cancelled', '{}'::jsonb)`,
      [crypto.randomUUID(), lesson_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Lesson canceled", lesson_id });

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

    res.json({ message: "Lesson completed", lesson_id });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}


export async function rescheduleLesson(req, res) {
  const { lesson_id, start_time, end_time } = req.body;

  if (!lesson_id || !start_time || !end_time) {
    return res.status(400).json({ error: "lesson_id, start_time and end_time are required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Verify original lesson exists and is currently scheduled
    const lessonCheck = await client.query(
      `
      SELECT *
      FROM current_scheduled_lessons
      WHERE identity_id = $1
      `,
      [lesson_id]
    );

    if (lessonCheck.rowCount === 0) {
      throw new Error("Original lesson not found or not active");
    }

    const original = lessonCheck.rows[0];

    const studentId = original.student_id;
    const instructorId = original.instructor_id;
    const carId = original.car_id;

    // 2️⃣ Cancel old lesson
    await client.query(
      `
      INSERT INTO event (id, identity_id, event_type, payload)
      VALUES ($1, $2, 'lesson_cancelled', '{}'::jsonb)
      `,
      [crypto.randomUUID(), lesson_id]
    );

    // 3️⃣ Generate new lesson ID
    const newLessonId = generateUUID();

    // 4️⃣ Create new identity
    await client.query(
      `
      INSERT INTO identity (id, identity_type)
      VALUES ($1, 'lesson')
      `,
      [newLessonId]
    );

    // Instructor daily capacity limit (max 3 per day)

    const dailyCount = await client.query(
      `
      SELECT COUNT(*) AS total
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.instructor_id = $1
        AND DATE(lower(e.lesson_range)) = DATE($2::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [instructorId, start_time]
    );

    const lessonCount = parseInt(dailyCount.rows[0].total, 10);

    if (lessonCount >= 3) {
      throw new Error("Instructor daily lesson limit reached");
    }


    // 5️⃣ Overlap validation (skip old lesson because already cancelled)

    const instructorConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.instructor_id = $1
        AND e.lesson_range && tstzrange($2::timestamptz, $3::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [instructorId, start_time, end_time]
    );

    if (instructorConflict.rowCount > 0) {
      throw new Error("Instructor already booked for this time");
    }

    const carConflict = await client.query(
      `
      SELECT 1
      FROM event e
      WHERE e.event_type = 'lesson_scheduled'
        AND e.car_id = $1
        AND e.lesson_range && tstzrange($2::timestamptz, $3::timestamptz)
        AND NOT EXISTS (
          SELECT 1 FROM event c
          WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
        )
      `,
      [carId, start_time, end_time]
    );

    if (carConflict.rowCount > 0) {
      throw new Error("Car already booked for this time");
    }

    // 6️⃣ Insert new lesson_scheduled
    await client.query(
      `
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload,
        instructor_id,
        car_id,
        lesson_range
      )
      VALUES (
        $1,
        $1,
        'lesson_scheduled',
        $2,
        $3,
        $4,
        tstzrange($5::timestamptz, $6::timestamptz)
      )
      `,
      [
        newLessonId,
        {
          student_id: studentId,
          instructor_id: instructorId,
          car_id: carId,
          start_time,
          end_time
        },
        instructorId,
        carId,
        start_time,
        end_time
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: "Lesson rescheduled successfully",
      old_lesson_id: lesson_id,
      new_lesson_id: newLessonId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}


