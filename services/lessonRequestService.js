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

      const studentCheck = await client.query(
        `SELECT 1 FROM current_active_students WHERE id = $1`,
        [student_id]
      );

      if (studentCheck.rowCount === 0) {
        throw new Error("Student not active");
      }

      const requestId = generateUUID();

      await client.query(
        `INSERT INTO identity (id, identity_type)
         VALUES ($1, 'lesson_request')`,
        [requestId]
      );

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

      // AUTO MATCHING
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

      return {
        message: "Lesson request created and offers dispatched",
        lesson_request_id: requestId,
        offers_sent: eligible.rows.map(r => r.id)
      };

    });

    res.status(201).json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
