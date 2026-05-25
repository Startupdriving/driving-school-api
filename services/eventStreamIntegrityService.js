import {

  createGovernanceIncident

} from "./governanceIncidentService.js";


export async function verifyLessonLifecycleIntegrity(

  client

) {

  const result =
  await client.query(`

    SELECT

      identity_id,

      event_type,

      sequence_number

    FROM event

    WHERE event_type IN (

      'lesson_requested',

      'lesson_offer_sent',

      'lesson_offer_accepted',

      'lesson_confirmed',

      'lesson_started',

      'lesson_completed',

      'lesson_cancelled',

      'lesson_rescheduled'

    )

    ORDER BY identity_id, sequence_number ASC

  `);
  // =====================================================
  // GROUP STREAMS
  // =====================================================

  const streams = {};

  for (const row of result.rows) {

    if (!streams[row.identity_id]) {

      streams[row.identity_id] = [];

    }

    streams[row.identity_id]
      .push(row);

  }

  // =====================================================
  // VERIFY STREAMS
  // =====================================================

  const violations = [];

  for (const identityId in streams) {

    const stream =
      streams[identityId];

    const eventTypes =
      stream.map(
        e => e.event_type
      );

    // ===================================================
    // RULE — started requires confirmed
    // ===================================================

    const hasConfirmed =
      eventTypes.includes(
        "lesson_confirmed"
      );

    const hasStarted =
      eventTypes.includes(
        "lesson_started"
      );

    if (

      hasStarted &&
      !hasConfirmed

    ) {

      violations.push({

        identity_id:
          identityId,

        violation:
          "lesson_started_without_confirmed"

      });

     await createGovernanceIncident(

  client,

  {

    incident_type:
      "event_stream_integrity_violation",

    severity:
      "critical",

    affected_stream:
      identityId,

    violation_type:
      "lesson_started_without_confirmed",

    recommended_action:
      "replay_projection:lesson_schedule_projection",

    payload: {

      identity_id:
        identityId

    }

  }

);
    }

    // ===================================================
    // RULE — completed requires started
    // ===================================================

    const hasCompleted =
      eventTypes.includes(
        "lesson_completed"
      );

    if (

      hasCompleted &&
      !hasStarted

    ) {

      violations.push({

        identity_id:
          identityId,

        violation:
          "lesson_completed_without_started"

      });

await createGovernanceIncident(

  client,

  {

    incident_type:
      "event_stream_integrity_violation",

    severity:
      "critical",

    affected_stream:
      identityId,

    violation_type:
      "lesson_completed_without_started",

    recommended_action:
      "investigate_stream_and_replay",

    payload: {

      identity_id:
        identityId

    }

  }

);

}
    // ===================================================
    // RULE — duplicate completion forbidden
    // ===================================================

    const completedCount =
      eventTypes.filter(
        e => e === "lesson_completed"
      ).length;

    if (completedCount > 1) {

      violations.push({

        identity_id:
          identityId,

        violation:
          "duplicate_lesson_completed"

      });


await createGovernanceIncident(

  client,

  {

    incident_type:
      "event_stream_integrity_violation",

    severity:
      "high",

    affected_stream:
      identityId,

    violation_type:
      "duplicate_lesson_completed",

    recommended_action:
      "inspect_duplicate_terminal_events",

    payload: {

      identity_id:
        identityId,

      duplicate_count:
        completedCount

    }

  }

);
}
  }

  // =====================================================
  // FINAL RESULT
  // =====================================================

  if (violations.length) {

    return {

      integrity_status:
        "corrupted",

      violations

    };

  }

  return {

    integrity_status:
      "healthy",

    violations: []

  };

}
