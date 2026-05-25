import pool from "../db.js";
import { handleEvent } from "../services/eventHandler.js";
import { handleReliabilityProjection } from "../services/reliabilityProjectionHandler.js";

async function rebuild() {

  const client = await pool.connect();

  try {

    console.log("♻ STARTING PROJECTION REBUILD");

    await client.query("BEGIN");

    // disable FK pressure during rebuild
    await client.query(`
      SET CONSTRAINTS ALL DEFERRED
    `);

    console.log("🧹 CLEARING PROJECTIONS");

    // add projection truncates here

    await client.query(`
      TRUNCATE TABLE

    lesson_schedule_projection,
    student_active_lesson_projection,
    lesson_offer_negotiation_projection,
    lesson_negotiation_projection,
    lesson_reschedule_projection

  RESTART IDENTITY CASCADE
`);



    console.log("📦 LOADING EVENTS");

    const events = await client.query(`
      SELECT *
       FROM event
       WHERE is_valid = TRUE
       ORDER BY sequence_number ASC
    `);

    console.log(
      `📚 EVENTS TO REPLAY: ${events.rows.length}`
    );

    for (const event of events.rows) {

      console.log(
        `⚙ REPLAY: ${event.event_type}`
      );

      try {

  await handleEvent(client, event);

  await handleReliabilityProjection(
  client,
  event
);

} catch (err) {

  console.error("REBUILD FAILED EVENT:");
  console.error({
    sequence_number: event.sequence_number,
    identity_id: event.identity_id,
    event_type: event.event_type,
    payload: event.payload
  });

  throw err;
}

    }

    await client.query("COMMIT");

    console.log("✅ REBUILD COMPLETE");

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(
      "❌ REBUILD FAILED:",
      err
    );

  } finally {

    client.release();
    process.exit();

  }
}

rebuild();
