import pool from "../db.js";

export async function findEligibleInstructors(req, res) {
  const { lesson_request_id } = req.params;

  const client = await pool.connect();

  try {
    // 1️⃣ Get request info
    const request = await client.query(
      `
      SELECT lower(lesson_range) AS start_time,
             upper(lesson_range) AS end_time
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_requested'
      `,
      [lesson_request_id]
    );

    if (request.rowCount === 0) {
      return res.status(404).json({ error: "Lesson request not found" });
    }

    const { start_time, end_time } = request.rows[0];

    // 2️⃣ Find online instructors
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
      `,
      [start_time, end_time]
    );

    return res.json({
      lesson_request_id,
      eligible_instructors: eligible.rows.map(r => r.id)
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}
