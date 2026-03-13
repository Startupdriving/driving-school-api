import pool from "../db.js";

export async function rebuildProjections() {

  const client = await pool.connect();

  try {

    console.log("🔄 Starting projection rebuild...");

    await client.query("BEGIN");

    // Clear projection tables
    await client.query(`TRUNCATE instructor_offer_stats RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE instructor_pending_offers RESTART IDENTITY CASCADE`);

    // Example: rebuild instructor_offer_stats
    await client.query(`
      INSERT INTO instructor_offer_stats (
        instructor_id,
        offers_last_24h,
        confirmed_last_24h,
        last_offer_at
      )
      SELECT
        instructor_id,
        COUNT(*) FILTER (
          WHERE event_type = 'lesson_offer_sent'
          AND created_at > NOW() - INTERVAL '24 hours'
        ),
        COUNT(*) FILTER (
          WHERE event_type = 'lesson_confirmed'
          AND created_at > NOW() - INTERVAL '24 hours'
        ),
        MAX(created_at) FILTER (
          WHERE event_type = 'lesson_offer_sent'
        )
      FROM event
      WHERE instructor_id IS NOT NULL
      GROUP BY instructor_id
    `);

    await client.query("COMMIT");

    console.log("✅ Projection rebuild complete");

  } catch (err) {

    await client.query("ROLLBACK");

    console.error("❌ Projection rebuild failed:", err);

  } finally {

    client.release();

  }

}
