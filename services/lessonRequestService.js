import { withIdempotency } from "./idempotencyService.js";
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

export async function requestLesson(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const {
        student_id,
        requested_start_time,
        requested_end_time
      } = req.body;

      if (!student_id || !requested_start_time || !requested_end_time) {
        throw new Error("student_id, requested_start_time, requested_end_time required");
      }

      if (!isValidUUID(student_id)) {
        throw new Error("Invalid student_id");
      }

      // Validate active student
      const studentCheck = await client.query(
        `SELECT 1 FROM current_active_students WHERE id = $1`,
        [student_id]
      );

      if (studentCheck.rowCount === 0) {
        throw new Error("Student not active");
      }

      const requestId = generateUUID();

      // 1️⃣ Create lesson_request identity
      await client.query(
        `INSERT INTO identity (id, identity_type)
         VALUES ($1, 'lesson_request')`,
        [requestId]
      );

      // 2️⃣ Insert lesson_requested event
      await client.query(
        `
        INSERT INTO event (
          id,
          identity_id,
          event_type,
          payload,
          lesson_range
        )
        VALUES (
          $1,
          $1,
          'lesson_requested',
          $2,
          tstzrange($3::timestamptz, $4::timestamptz)
        )
        `,
        [
          requestId,
          {
            student_id,
            requested_start_time,
            requested_end_time
          },
          requested_start_time,
          requested_end_time
        ]
      );

      return {
        message: "Lesson request created",
        lesson_request_id: requestId
      };
    });

    res.status(201).json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// 3️⃣ Auto-match eligible instructors (top 3)

const eligible = await client.query(
  `
  SELECT i.id
  FROM identity i
  JOIN current_online_instructors o
    ON i.id = o.instructor_id
  WHERE i.identity_type = 'instructor'
  AND NOT EXISTS (
    SELECT 1 FROM event e
    WHERE e.instructor_id = i.id
    AND e.event_type = 'lesson_scheduled'
    AND e.lesson_range && tstzrange($1::timestamptz, $2::timestamptz)
    AND NOT EXISTS (
      SELECT 1 FROM event c
      WHERE c.identity_id = e.identity_id
      AND c.event_type = 'lesson_cancelled'
    )
  )
  LIMIT 3
  `,
  [requested_start_time, requested_end_time]
);

// Insert lesson_offer_sent events
for (const row of eligible.rows) {
  await client.query(
    `
    INSERT INTO event (id, identity_id, event_type, payload)
    VALUES ($1, $2, 'lesson_offer_sent', $3)
    `,
    [
      crypto.randomUUID(),
      requestId,
      { instructor_id: row.id }
    ]
  );
}


export async function sendOffer(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const { lesson_request_id, instructor_id } = req.body;

      if (!lesson_request_id || !instructor_id) {
        throw new Error("lesson_request_id and instructor_id required");
      }

      // 1️⃣ Verify lesson_request exists
      const requestCheck = await client.query(
        `
        SELECT 1
        FROM identity
        WHERE id = $1
        AND identity_type = 'lesson_request'
        `,
        [lesson_request_id]
      );

      if (requestCheck.rowCount === 0) {
        throw new Error("Lesson request not found");
      }

      // 2️⃣ Insert lesson_offer_sent event
      await client.query(
        `
        INSERT INTO event (id, identity_id, event_type, payload)
        VALUES ($1, $2, 'lesson_offer_sent', $3)
        `,
        [
          crypto.randomUUID(),
          lesson_request_id,
          { instructor_id }
        ]
      );

      return {
        message: "Offer sent",
        lesson_request_id,
        instructor_id
      };
    });

    res.json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });


export async function acceptOffer(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const { lesson_request_id, instructor_id, car_id } = req.body;

      if (!lesson_request_id || !instructor_id || !car_id) {
        throw new Error("lesson_request_id, instructor_id, car_id required");
      }

      // 1️⃣ Verify request exists and not already confirmed
      // 1️⃣ Lock lesson_request row (prevents race conditions)
const lockRequest = await client.query(
  `
  SELECT id
  FROM identity
  WHERE id = $1
  AND identity_type = 'lesson_request'
  FOR UPDATE
  `,
  [lesson_request_id]
);

if (lockRequest.rowCount === 0) {
  throw new Error("Lesson request not found");
}

// 2️⃣ Check if already confirmed
const confirmedCheck = await client.query(
  `
  SELECT 1
  FROM event
  WHERE identity_id = $1
  AND event_type = 'lesson_confirmed'
  `,
  [lesson_request_id]
);

if (confirmedCheck.rowCount > 0) {
  throw new Error("Lesson request already confirmed");
}


      // 2️⃣ Verify offer was sent to this instructor
      const offerCheck = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_offer_sent'
        AND payload->>'instructor_id' = $2
        `,
        [lesson_request_id, instructor_id]
      );

      if (offerCheck.rowCount === 0) {
        throw new Error("No offer found for this instructor");
      }

      // 3️⃣ Get requested time
      const requestInfo = await client.query(
        `
        SELECT lower(lesson_range) AS start_time,
               upper(lesson_range) AS end_time,
               payload->>'student_id' AS student_id
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_requested'
        `,
        [lesson_request_id]
      );

      if (requestInfo.rowCount === 0) {
        throw new Error("Original request not found");
      }

      const { start_time, end_time, student_id } = requestInfo.rows[0];

      // 4️⃣ Insert lesson_offer_accepted
      await client.query(
        `
        INSERT INTO event (id, identity_id, event_type, payload)
        VALUES ($1, $2, 'lesson_offer_accepted', $3)
        `,
        [
          crypto.randomUUID(),
          lesson_request_id,
          { instructor_id }
        ]
      );

      // 5️⃣ Insert lesson_confirmed
      await client.query(
        `
        INSERT INTO event (id, identity_id, event_type, payload)
        VALUES ($1, $2, 'lesson_confirmed', $3)
        `,
        [
          crypto.randomUUID(),
          lesson_request_id,
          { instructor_id }
        ]
      );

      // 6️⃣ Create lesson identity
      const lessonId = crypto.randomUUID();

      await client.query(
        `
        INSERT INTO identity (id, identity_type)
        VALUES ($1, 'lesson')
        `,
        [lessonId]
      );

      // 7️⃣ Insert lesson_scheduled
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
          {
            student_id,
            instructor_id,
            car_id,
            start_time,
            end_time
          },
          instructor_id,
          car_id,
          start_time,
          end_time
        ]
      );

      return {
        message: "Offer accepted and lesson scheduled",
        lesson_id: lessonId
      };
    });

    res.json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
