import {
  handleEvent
} from "./eventHandler.js";
import {

  acquireReplayLock,
  releaseReplayLock

} from "./replayLockService.js";


const projectionReplayMap = {

  lesson_schedule_projection: [
    "lesson_created",
    "lesson_started",
    "lesson_completed",
    "lesson_cancelled",
    "lesson_rescheduled"
  ],

  student_active_lesson_projection: [
    "lesson_created",
    "lesson_started",
    "lesson_completed",
    "lesson_cancelled"
  ],

  lesson_offer_negotiation_projection: [
    "lesson_offer_sent",
    "lesson_offer_accepted",
    "lesson_offer_countered"
  ],

  lesson_reschedule_projection: [
    "lesson_reschedule_requested",
    "lesson_rescheduled"
  ]

};





export async function replaySingleProjection(

  client,
  projectionName

) {

  console.log(
    `🔁 REPLAY SINGLE PROJECTION: ${projectionName}`
  );

await acquireReplayLock(

  client,

  `projection_replay:${projectionName}`

);

 // =====================================================
  // STEP 4 — VALIDATE PROJECTION
  // =====================================================

  const relevantEvents =

    projectionReplayMap[
      projectionName
    ];

  if (!relevantEvents) {

    throw new Error(
      `unknown_projection:${projectionName}`
    );

  }

  // =====================================================
  // STEP 5 — CLEAR TARGET PROJECTION
  // =====================================================

  await client.query(`
    TRUNCATE TABLE ${projectionName}
  `);

  // =====================================================
  // STEP 6 — RESET CHECKPOINT
  // =====================================================

  await client.query(`
    DELETE FROM projection_checkpoint
    WHERE projection_name = $1
  `, [projectionName]);

  // =====================================================
  // STEP 7 — LOAD RELEVANT EVENTS ONLY
  // =====================================================

  const { rows: events } =
    await client.query(`

      SELECT *
      FROM event

      WHERE is_valid = TRUE

      AND event_type = ANY($1)

      ORDER BY sequence_number ASC

    `, [relevantEvents]);

  // =====================================================
  // STEP 8 — REPLAY ONLY TARGET EVENTS
  // =====================================================

  for (const event of events) {

    console.log(
      `⚙️ SINGLE REPLAY EVENT: ${event.event_type}`
    );

    await handleEvent(
      client,
      event,
      true
    );

  }


await releaseReplayLock(

  client,

  `projection_replay:${projectionName}`

);


  // =====================================================
  // STEP 9 — SUCCESS RETURN
  // =====================================================

  return {

    projection:
      projectionName,

    replayed_events:
      events.length

  };

}
