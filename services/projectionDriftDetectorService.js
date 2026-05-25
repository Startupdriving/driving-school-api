const projectionTargets = [

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

export async function detectProjectionDrift(
  client
) {

  console.log(
    "🧪 RUNNING DRIFT DETECTOR..."
  );

  for (const target of projectionTargets) {

    // =====================================================
    // EXPECTED SEQUENCE
    // =====================================================

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

    // =====================================================
    // ACTUAL CHECKPOINT
    // =====================================================

    const checkpointRes =
      await client.query(`
        SELECT
          last_processed_sequence
        FROM projection_checkpoint
        WHERE projection_name = $1
      `, [target.projection]);

    let actualSequence = 0;

    if (checkpointRes.rows.length) {

      actualSequence =
        Number(
          checkpointRes.rows[0]
            .last_processed_sequence
        );

    }

    // =====================================================
    // CLASSIFY STATUS
    // =====================================================

    let driftStatus;

    if (
      actualSequence === expectedSequence
    ) {

      driftStatus = "healthy";

    }

    else if (
      actualSequence > expectedSequence
    ) {

      driftStatus =
        "overprocessed";

    }

    else if (
      actualSequence < expectedSequence
    ) {

      driftStatus =
        "lagging";

    }

    else {

      driftStatus =
        "corrupted";

    }

    // =====================================================
    // SEVERITY
    // =====================================================

    let severity;

    switch (driftStatus) {

      case "healthy":
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

     // =====================================================
    // AUTO RESOLVE HEALTHY ALERTS
    // =====================================================

    if (
      driftStatus === "healthy"
    ) {

      await client.query(`
        UPDATE projection_drift_alert
        SET resolved_at = NOW()
        WHERE projection_name = $1
          AND resolved_at IS NULL
      `, [target.projection]);

      continue;

    }


    // =====================================================
    // PREVENT DUPLICATE ALERTS
    // =====================================================

    const existingAlert =
      await client.query(`
        SELECT id
        FROM projection_drift_alert
        WHERE projection_name = $1
          AND drift_status = $2
          AND resolved_at IS NULL
        LIMIT 1
      `, [
        target.projection,
        driftStatus
      ]);

    if (
      existingAlert.rows.length
    ) {

      continue;

    }

    // =====================================================
    // CREATE ALERT
    // =====================================================

    const lag =
      Math.max(
        0,
        expectedSequence -
        actualSequence
      );

    await client.query(`
      INSERT INTO projection_drift_alert (

        projection_name,
        expected_sequence,
        actual_sequence,
        lag,
        drift_status,
        severity,
        alert_message

      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
    `, [

      target.projection,

      expectedSequence,

      actualSequence,

      lag,

      driftStatus,

      severity,

      `projection_${driftStatus}:${target.projection}`

    ]);

    console.log(
      `🚨 DRIFT DETECTED: ${target.projection}`
    );

  }

}
