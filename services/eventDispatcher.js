import pool from "../db.js";
import { handleEvent } from "./eventHandler.js";
import { handleReliabilityProjection } from "./reliabilityProjectionHandler.js";

export function startEventDispatcher() {
  console.log("🚀 EVENT DISPATCHER RUNNING");

  let running = false;

  setInterval(async () => {

  if (running) {
    return;
  }

  running = true;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");


const latest = await client.query(`
  SELECT
    sequence_number,
    event_type,
    processed
  FROM event
  ORDER BY sequence_number DESC
  LIMIT 5
`);



const debugEvent = await client.query(`
  SELECT
    sequence_number,
    event_type,
    processed,
    failed
  FROM event
  WHERE sequence_number >= 108
  ORDER BY sequence_number DESC
`);


      const raw = await client.query(`
  SELECT
    sequence_number,
    event_type,
    processed,
    failed
  FROM event
  WHERE processed = FALSE
  AND failed = FALSE
  ORDER BY sequence_number ASC
  LIMIT 20
`);

const { rows } = await client.query(`
  SELECT *
  FROM event
  WHERE processed = FALSE
  AND failed = FALSE
  ORDER BY sequence_number ASC
  LIMIT 20
  FOR UPDATE SKIP LOCKED
`);



      for (const event of rows) {
  try {

    await handleEvent(client, event);

    await handleReliabilityProjection( client, event);
    // ✅ SUCCESS → mark processed
    await client.query(`
      UPDATE event
      SET processed = TRUE
      WHERE id = $1
    `, [event.id]);

  } catch (err) {
    console.error("❌ EVENT FAILED:", event.event_type, err.message);

    // 🔁 retry logic
    const result = await client.query(`
  UPDATE event
  SET
    retry_count = retry_count + 1,
    failed = CASE
      WHEN retry_count + 1 >= 3
      THEN TRUE
      ELSE FALSE
    END
  WHERE id = $1
  RETURNING retry_count, failed
`, [event.id]);

const retryCount = result.rows[0].retry_count;
const failed = result.rows[0].failed;

if (failed) {
  console.error("💀 DEAD EVENT:", event.id, event.event_type);

  await client.query(`
    INSERT INTO dead_letter_event (
      original_event_id,
      identity_id,
      event_type,
      payload,
      error_message,
      retry_count
    )
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    event.id,
    event.identity_id,
    event.event_type,
    event.payload,
    err.message,
    retryCount
  ]);

  await client.query(`
    UPDATE event
    SET processed = TRUE
    WHERE id = $1
  `, [event.id]);

const verifyProcessed = await client.query(`
  SELECT
    sequence_number,
    event_type,
    processed
  FROM event
  WHERE id = $1
`, [event.id]);

}

  }
}


      await client.query("COMMIT");

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("EVENT DISPATCH ERROR:", err);
    } finally {
      client.release();

      running = false;

    }

  }, 500);
}
