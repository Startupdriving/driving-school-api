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


