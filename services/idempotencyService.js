export async function withIdempotency(client, key, handler) {
  if (!key) {
    throw new Error("Idempotency-Key header required");
  }

  // Try insert placeholder
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
    // Already exists → return stored response
    const existing = await client.query(
      `SELECT response FROM idempotency_key WHERE key = $1`,
      [key]
    );

    return {
      alreadyProcessed: true,
      response: existing.rows[0].response
    };
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

