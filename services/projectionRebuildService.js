import pool from "../db.js";

export async function rebuildProjections() {

  const client = await pool.connect();

  try {

    console.log("🔄 Starting projection rebuild...");

    await client.query("BEGIN");

    // Clear projection tables
    await client.query(`TRUNCATE instructor_offer_stats RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE instructor_pending_offers RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE instructor_offers_projection RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE active_lessons_projection RESTART IDENTITY CASCADE`);


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

console.log("🔥 REBUILD: inserting instructor offers");

    await client.query(`
  INSERT INTO instructor_offers_projection (
    instructor_id,
    lesson_request_id,
    status,
    created_at
  )
  SELECT
    (payload->>'instructor_id')::uuid,
    (payload->>'lesson_request_id')::uuid,
    'pending',
    created_at
  FROM event
  WHERE event_type = 'lesson_offer_sent'
  AND payload->>'instructor_id' IS NOT NULL
  AND payload->>'lesson_request_id' IS NOT NULL

  ON CONFLICT (instructor_id, lesson_request_id) DO NOTHING
`);


   await client.query(`
  DELETE FROM instructor_offers_projection iop
  USING event e
  WHERE e.event_type = 'lesson_offer_accepted'
  AND (e.payload->>'instructor_id')::uuid = iop.instructor_id
  AND (e.payload->>'lesson_request_id')::uuid = iop.lesson_request_id
`);



await client.query(`
  INSERT INTO active_lessons_projection (
    lesson_id,
    lesson_request_id,
    instructor_id,
    status,
    created_at
  )
  SELECT
    lc.identity_id AS lesson_id,
    (lc.payload->>'lesson_request_id')::uuid,
    lc.instructor_id,

    CASE
      WHEN EXISTS (
        SELECT 1 FROM event e2
        WHERE e2.identity_id = lc.identity_id
        AND e2.event_type = 'lesson_started'
      ) THEN 'started'
      ELSE 'created'
    END AS status,

    lc.created_at

  FROM event lc

  WHERE lc.event_type = 'lesson_created'

  -- ❌ remove completed
  AND NOT EXISTS (
    SELECT 1 FROM event e3
    WHERE e3.identity_id = lc.identity_id
    AND e3.event_type = 'lesson_completed'
  )

  -- ❌ remove cancelled
  AND NOT EXISTS (
    SELECT 1 FROM event e4
    WHERE e4.identity_id = lc.identity_id
    AND e4.event_type = 'lesson_cancelled'
  )
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
