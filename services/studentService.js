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

// CREATE STUDENT
export async function createStudent(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const studentId = generateUUID();

    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'student')`,
      [studentId]
    );

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_created', $3::jsonb)`,
      [
        generateUUID(),
        studentId,
        JSON.stringify({
          performed_by: "system",
          source: "api",
          action: "student_created"
        })
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Student created",
      student_id: studentId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ACTIVATE STUDENT
export async function activateStudent(req, res) {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }

  if (!isValidUUID(student_id)) {
    return res.status(400).json({ error: "student_id must be a valid UUID" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeCheck = await client.query(
      `SELECT 1 FROM current_active_students WHERE id = $1`,
      [student_id]
    );

    if (activeCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Student already active" });
    }

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_activated', $3::jsonb)`,
      [
        generateUUID(),
        student_id,
        JSON.stringify({
          performed_by: "system",
          source: "api",
          action: "student_activated"
        })
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "Student activated" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

// DEACTIVATE STUDENT
export async function deactivateStudent(req, res) {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id is required" });
  }

  if (!isValidUUID(student_id)) {
    return res.status(400).json({ error: "student_id must be a valid UUID" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeCheck = await client.query(
      `SELECT 1 FROM current_active_students WHERE id = $1`,
      [student_id]
    );

    if (activeCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Student already inactive" });
    }

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_deactivated', $3::jsonb)`,
      [
        generateUUID(),
        student_id,
        JSON.stringify({
          performed_by: "system",
          source: "api",
          action: "student_deactivated"
        })
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "Student deactivated" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

