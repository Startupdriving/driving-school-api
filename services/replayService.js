import pool from "../db.js";

export async function replayDeadEvent(req, res) {
  const { dead_event_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Load dead event
    const { rows } = await client.query(`
      SELECT *
      FROM dead_letter_event
      WHERE id = $1
      LIMIT 1
    `, [dead_event_id]);

    if (!rows.length) {
      throw new Error("dead_event_not_found");
    }

    const dead = rows[0];

    // 2️⃣ Reset original event
    await client.query(`
      UPDATE event
      SET
        processed = FALSE,
        failed = FALSE,
        retry_count = 0
      WHERE id = $1
    `, [dead.original_event_id]);

    // 3️⃣ Remove from DLQ
    await client.query(`
      DELETE FROM dead_letter_event
      WHERE id = $1
    `, [dead_event_id]);

    await client.query("COMMIT");

    res.json({
      status: "replayed",
      original_event_id: dead.original_event_id
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  } finally {
    client.release();
  }
}
