import pool from "../db.js";

export async function withIdempotency(req, handler) {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
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
      [idempotencyKey]
    );

    if (insertKey.rowCount === 0) {
      const existing = await client.query(
        `SELECT response FROM idempotency_key WHERE key = $1`,
        [idempotencyKey]
      );

      await client.query("ROLLBACK");
      return existing.rows[0].response;
    }

    const response = await handler(client);

    await client.query(
      `
      UPDATE idempotency_key
      SET response = $2
      WHERE key = $1
      `,
      [idempotencyKey, response]
    );

    await client.query("COMMIT");

    return response;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
