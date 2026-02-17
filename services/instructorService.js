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

// CREATE INSTRUCTOR
export async function createInstructor(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const instructorId = generateUUID();

    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'instructor')`,
      [instructorId]
    );

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'instructor_created', $3::jsonb)`,
      [
        generateUUID(),
        instructorId,
        JSON.stringify({
          performed_by: "system",
          source: "api",
          action: "instructor_created"
        })
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Instructor created",
      instructor_id: instructorId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ACTIVATE INSTRUCTOR
export async function activateInstructor(req, res) {
  const { instructor_id } = req.body;

  if (!instructor_id) {
    return res.status(400).json({ error: "instructor_id is required" });
  }

  if (!isValidUUID(instructor_id)) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeCheck = await client.query(
      `SELECT 1 FROM current_active_instructors WHERE id = $1`,
      [instructor_id]
    );

    if (activeCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Instructor already active" });
    }

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'instructor_activated', $3::jsonb)`,
      [
        generateUUID(),
        instructor_id,
        JSON.stringify({
          performed_by: "system",
          source: "api",
          action: "instructor_activated"
        })
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "Instructor activated" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function setInstructorAvailability(req, res) {
  const { instructor_id, day_of_week, start_time, end_time } = req.body;

  if (!instructor_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: "All fields required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure instructor exists
    const check = await client.query(
      `SELECT 1 FROM identity 
       WHERE id = $1 AND identity_type = 'instructor'`,
      [instructor_id]
    );

    if (check.rowCount === 0) {
      throw new Error("Instructor not found");
    }

    await client.query(
      `
      INSERT INTO event (id, identity_id, event_type, payload)
      VALUES ($1, $2, 'instructor_availability_set', $3::jsonb)
      `,
      [
        crypto.randomUUID(),
        instructor_id,
        JSON.stringify({
          day_of_week,
          start_time,
          end_time
        })
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "Availability added" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}
