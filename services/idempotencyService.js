import pool from "../db.js";

export async function withIdempotency(req, handler) {
  const key = req.headers["idempotency-key"];

  if (!key) {
    throw new Error("Idempotency-Key header required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertKey = await client.query(
      `
      INSERT INTO idempotency_key (key, response)
      VALUES ($1, '{}'::jsonb)
      ON CONFLICT (key) DO NOTHING
      RETURNING key
      `,
      [key]
    );

    if (insertKey.rowCount === 0) {
      const existing = await client.query(
        `SELECT response FROM idempotency_key WHERE key = $1`,
        [key]
      );

      await client.query("ROLLBACK");
      return existing.rows[0].response;
    }

    // Execute actual business logic
    const responseBody = await handler(client);

    await client.query(
      `
      UPDATE idempotency_key
      SET response = $2
      WHERE key = $1
      `,
      [key, responseBody]
    );

    await client.query("COMMIT");

    return responseBody;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

