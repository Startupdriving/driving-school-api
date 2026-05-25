import pool from "../db.js";
import { handleEvent } from "./eventHandler.js";
import {
  detectProjectionDrift
} from "./projectionDriftDetectorService.js";
import {

  acquireReplayLock,
  releaseReplayLock

} from "./replayLockService.js";


export async function rebuildProjections(req, res) {

  const client = await pool.connect();
  let replayId = null;
  try {

    console.log("🧨 Starting projection rebuild...");

    await acquireReplayLock(

  client,

  "global_projection_rebuild"

);

    const replayStart =
  Date.now();

const auditRes =
  await client.query(`
    INSERT INTO replay_audit_log (

      replay_type,
      projection_name,
      started_at,
      replay_status

    )
    VALUES (
      $1,
      $2,
      NOW(),
      'running'
    )
    RETURNING id
  `, [
    'full_rebuild',
     null
  ]);

replayId =
  auditRes.rows[0].id;


    await client.query("BEGIN");



     // reset checkpoints
await client.query(`
  UPDATE projection_checkpoint
  SET
    last_processed_sequence = 0,
    updated_at = NOW()
`);

    // =====================================================
    // CLEAR PROJECTIONS
    // =====================================================

    console.log("🗑️ Clearing projections...");

    await client.query(`
      TRUNCATE TABLE

        -- core projections
        lesson_schedule_projection,
        student_active_lesson_projection,
        lesson_offer_negotiation_projection,
        lesson_reschedule_projection,
        student_profile_projection,
        instructor_profile_projection,


            -- replay infrastructure
        projection_checkpoint,
        projection_event_log,



        -- analytics / legacy projections
        instructor_offer_stats,
        instructor_pending_offers,
        instructor_offers_projection,
        active_lessons_projection

      RESTART IDENTITY CASCADE
    `);

    // =====================================================
    // EVENT REPLAY REBUILD
    // =====================================================

    console.log("📚 REPLAYING EVENTS...");

    const { rows: events } = await client.query(`
      SELECT *
       FROM event
       WHERE is_valid = TRUE
       ORDER BY sequence_number ASC
    `);

     let successfulEvents = 0;
     let failedEvents = 0;


    for (const event of events) {

      try {

        console.log(
          "⚙️ REBUILD EVENT:",
          event.event_type
        );

        await handleEvent(client, event);

        successfulEvents++;

      }
        catch (err) {
    failedEvents++;
  console.error(
    "❌ REBUILD EVENT FAILED:",
    event.event_type,
    err
  );

  throw err;

}
    }

    // =====================================================
    // ANALYTICS REBUILD
    // =====================================================

    console.log("📊 REBUILDING ANALYTICS...");

    // -----------------------------------------------------
    // instructor_offer_stats
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // instructor_offers_projection
    // (legacy analytics support)
    // -----------------------------------------------------

    console.log("📦 REBUILD: instructor offers");

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

      ON CONFLICT (
        instructor_id,
        lesson_request_id
      )
      DO NOTHING
    `);

    // remove accepted offers
    await client.query(`
      DELETE FROM instructor_offers_projection iop

      USING event e

      WHERE e.event_type = 'lesson_offer_accepted'

      AND (e.payload->>'instructor_id')::uuid = iop.instructor_id

      AND (e.payload->>'lesson_request_id')::uuid =
          iop.lesson_request_id
    `);

    // -----------------------------------------------------
    // active_lessons_projection
    // (legacy analytics support)
    // -----------------------------------------------------

    console.log("🚗 REBUILD: active lessons");

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
            SELECT 1
            FROM event e2
            WHERE e2.identity_id = lc.identity_id
            AND e2.event_type = 'lesson_started'
          )
          THEN 'started'

          ELSE 'created'
        END AS status,

        lc.created_at

      FROM event lc

      WHERE lc.event_type = 'lesson_created'

      -- remove completed
      AND NOT EXISTS (
        SELECT 1
        FROM event e3
        WHERE e3.identity_id = lc.identity_id
        AND e3.event_type = 'lesson_completed'
      )

      -- remove cancelled
      AND NOT EXISTS (
        SELECT 1
        FROM event e4
        WHERE e4.identity_id = lc.identity_id
        AND e4.event_type = 'lesson_cancelled'
      )
    `);

    // =====================================================
    // COMPLETE
    // =====================================================

await client.query(`
  UPDATE replay_audit_log
  SET

    completed_at = NOW(),

    duration_ms =
  EXTRACT(
    EPOCH FROM (
      NOW() - started_at
    )
  ) * 1000,

    total_events = $1,

    successful_events = $2,

    failed_events = $3,
    replay_throughput_eps =

  CASE

    WHEN EXTRACT(
      EPOCH FROM (
        NOW() - started_at
      )
    ) > 0

    THEN (

      $4 /

      EXTRACT(
        EPOCH FROM (
          NOW() - started_at
        )
      )

    )

    ELSE 0

  END,

    replay_status = 'completed'

  WHERE id = $5
`, [

  events.length,
  successfulEvents,
  failedEvents,

  Number(events.length),

  replayId

]);

    await client.query("COMMIT");

    await detectProjectionDrift(
  client
);
    console.log("✅ Projection rebuild complete");


    await releaseReplayLock(

  client,

  "global_projection_rebuild"

);


    console.log(
  "🧪 VALIDATING REPLAY..."
);

const validationTargets = [

  {
    projection:
      "lesson_schedule_projection",

    events: [
      "lesson_created",
      "lesson_started",
      "lesson_completed",
      "lesson_cancelled",
      "lesson_rescheduled"
    ]
  },

  {
    projection:
      "student_active_lesson_projection",

    events: [
      "lesson_created",
      "lesson_started",
      "lesson_completed",
      "lesson_cancelled"
    ]
  },

  {
    projection:
      "lesson_offer_negotiation_projection",

    events: [
      "lesson_offer_sent",
      "lesson_offer_accepted",
      "lesson_offer_countered"
    ]
  },

  {
    projection:
      "lesson_reschedule_projection",

    events: [
      "lesson_reschedule_requested",
      "lesson_rescheduled"
    ]
  }

];


for (const target of validationTargets) {

  const expectedRes =
    await client.query(`
      SELECT COALESCE(
        MAX(sequence_number),
        0
      ) AS seq
      FROM event
      WHERE event_type = ANY($1)
    `, [target.events]);

  const expectedSequence =
    Number(
      expectedRes.rows[0].seq
    );

  const checkpointRes =
    await client.query(`
      SELECT
        last_processed_sequence
      FROM projection_checkpoint
      WHERE projection_name = $1
    `, [target.projection]);

  const actualSequence =
    checkpointRes.rows.length
      ? Number(
          checkpointRes.rows[0]
            .last_processed_sequence
        )
      : 0;

  const lag =
    Math.max(
      0,
      expectedSequence -
      actualSequence
    );

  const countRes =
    await client.query(`
      SELECT COUNT(*) AS count
      FROM ${target.projection}
    `);

  const projectionRowCount =
    Number(
      countRes.rows[0].count
    );

  let validationStatus;

if (
  actualSequence === expectedSequence
) {

  validationStatus =
    "converged";

}

else if (
  actualSequence > expectedSequence
) {

  validationStatus =
    "overprocessed";

}

else if (
  actualSequence < expectedSequence
) {

  validationStatus =
    "lagging";

}

else {

  validationStatus =
    "corrupted";

}



let severity;

switch (validationStatus) {

  case "converged":
    severity = "info";
  break;

  case "overprocessed":
    severity = "low";
  break;

  case "lagging":
    severity = "warning";
  break;

  case "corrupted":
    severity = "critical";
  break;

  default:
    severity = "unknown";

}

  await client.query(`
    INSERT INTO replay_validation_report (

      replay_id,
      projection_name,
      expected_sequence,
      actual_sequence,
      lag,
      projection_row_count,
      validation_status,
      severity

    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8
    )
  `, [

    replayId,
    target.projection,
    expectedSequence,
    actualSequence,
    lag,
    projectionRowCount,
    validationStatus,
    severity

  ]);

}

    return {
          status: "rebuild_complete",
          total_events: events.length
       };

  } catch (err) {

    await client.query("ROLLBACK");

    await client.query(`
  UPDATE replay_audit_log
  SET

    completed_at = NOW(),

    replay_status = 'failed',

    error_message = $1

  WHERE id = $2
`, [
  err.message,
  replayId
]);

    console.error(
      "❌ Projection rebuild failed:",
      err
    );

    throw err;

  } finally {

    client.release();
  }
}
