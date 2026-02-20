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
