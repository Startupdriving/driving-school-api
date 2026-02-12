import pool from "../db.js";
import crypto from "crypto";

// Generate UUID safely
function generateUUID() {
  return crypto.randomUUID();
}

// CREATE STUDENT
export async function createStudent(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const studentId = generateUUID();

    // Insert identity
    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'student')`,
      [studentId]
    );

    // Insert event
    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_created', $3)`,
      [generateUUID(), studentId, {}]
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_activated', $3)`,
      [generateUUID(), student_id, {}]
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO event (id, identity_id, event_type, payload)
       VALUES ($1, $2, 'student_deactivated', $3)`,
      [generateUUID(), student_id, {}]
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
