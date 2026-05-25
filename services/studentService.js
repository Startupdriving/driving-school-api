import pool from "../db.js";
import crypto from "crypto";
import { handleEvent } from "./eventHandler.js";
import { insertEvent }
from "./eventStore.js";


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

if (!req.body.full_name) {
    return res.status(400).json({
      error: "full_name required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const studentId = generateUUID();


        await client.query(`
      INSERT INTO identity (id, identity_type)
      VALUES ($1, 'student')
      ON CONFLICT DO NOTHING
    `, [studentId]);




    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'student')`,
      [studentId]
    );

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    studentId,

  event_type:
    "student_created",

  payload: {

    performed_by:
      "system",

    source:
      "api",

    action:
      "student_created",

    full_name:
      req.body.full_name,

    phone:
      req.body.phone || null

  }

});

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

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    student_id,

  event_type:
    "student_activated",

  payload: {

    performed_by:
      "system",

    source:
      "api",

    action:
      "student_activated"

  }

});

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

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    student_id,

  event_type:
    "student_deactivated",

  payload: {

    performed_by:
      "system",

    source:
      "api",

    action:
      "student_deactivated"

  }

});

    await client.query("COMMIT");

    res.json({ message: "Student deactivated" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}


export async function updateStudent(req, res) {
  const { student_id, full_name, phone } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: "student_id required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    student_id,

  event_type:
    "student_updated",

  payload: {

    full_name,

    phone

  }

});

    await client.query("COMMIT");

    return res.json({ status: "updated" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "update_failed" });
  } finally {
    client.release();
  }
}
