import express from "express";
import pool from "../db.js";
import {
  handleEvent
} from "../services/eventHandler.js";
import {
  rebuildProjections
} from "../services/projectionRebuildService.js";
import {
  replaySingleProjection
} from "../services/singleProjectionReplayService.js";
import {

  verifyStudentActiveLessonIntegrity

} from "../services/projectionIntegrityService.js";
import {

  verifyLessonLifecycleIntegrity

} from "../services/eventStreamIntegrityService.js";
import {

  appendGovernanceTimelineEvent

} from "../services/governanceTimelineService.js";





const projectionEventMap = {

  lesson_schedule_projection: [
    "lesson_created",
    "lesson_started",
    "lesson_completed",
    "lesson_cancelled",
    "lesson_rescheduled"
  ],

  lesson_reschedule_projection: [
    "lesson_reschedule_requested",
    "lesson_rescheduled"
  ],

  lesson_offer_negotiation_projection: [
    "lesson_offer_sent",
    "lesson_offer_accepted",
    "lesson_offer_countered"
  ],

  student_active_lesson_projection: [
    "lesson_created",
    "lesson_started",
    "lesson_completed",
    "lesson_cancelled"
  ],

  instructor_reliability_projection: [
    "lesson_completed",
    "lesson_cancelled",
    "lesson_offer_sent",
    "lesson_offer_accepted"
  ]

};


const router = express.Router();

router.get("/projection-health", async (req, res) => {

  try {

    const projectionsRes =
      await pool.query(`
        SELECT
          projection_name,
          last_processed_sequence,
          last_processed_at
        FROM projection_checkpoint
        ORDER BY projection_name
      `);

    const projections = await Promise.all(

  projectionsRes.rows.map(async (p) => {

    const relevantEvents =
      projectionEventMap[
        p.projection_name
      ] || [];

    const relevantRes =
      await pool.query(`
        SELECT COALESCE(
          MAX(sequence_number),
          0
        ) AS relevant_sequence
        FROM event
        WHERE event_type = ANY($1)
      `, [relevantEvents]);

    const relevantSequence =
      Number(
        relevantRes.rows[0]
          .relevant_sequence
      );

    const checkpoint =
      Number(
        p.last_processed_sequence
      );

    const lag =
      Math.max(
        0,
        relevantSequence - checkpoint
      );

    return {

      projection_name:
        p.projection_name,

      last_processed_sequence:
        checkpoint,

      global_sequence:
        relevantSequence,

      lag,

      healthy:
        lag <= 0,

      last_processed_at:
        p.last_processed_at

    };

  })

);

    res.json({
     projections
  });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "projection_health_failed"
    });

  }

});


router.get("/dead-events", async (req, res) => {

  try {

    const result =
      await pool.query(`
        SELECT
          id,
          original_event_id,
          identity_id,
          event_type,
          error_message,
          retry_count,
          failed_at
        FROM dead_letter_event
        ORDER BY failed_at DESC
      `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "dead_events_fetch_failed"
    });

  }

});




router.post(
  "/retry-dead-event/:id",

  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const deadEventId =
        req.params.id;

      await client.query("BEGIN");

      // =====================================================
      // FETCH DEAD EVENT
      // =====================================================

      const deadRes =
        await client.query(`
          SELECT *
          FROM dead_letter_event
          WHERE id = $1
          LIMIT 1
        `, [deadEventId]);

      if (
        deadRes.rowCount === 0
      ) {

        throw new Error(
          "dead_event_not_found"
        );

      }

      const deadEvent =
        deadRes.rows[0];

      // =====================================================
      // FETCH ORIGINAL EVENT
      // =====================================================

      const eventRes =
        await client.query(`
          SELECT *
          FROM event
          WHERE id = $1
          LIMIT 1
        `, [
          deadEvent.original_event_id
        ]);

      if (
        eventRes.rowCount === 0
      ) {

        throw new Error(
          "original_event_not_found"
        );

      }

      const event =
        eventRes.rows[0];

      // =====================================================
      // RETRY EVENT
      // =====================================================

      await handleEvent(
        client,
        event,
        { replay: true }
      );

      // =====================================================
      // DELETE DEAD LETTER
      // =====================================================

      await client.query(`
        DELETE FROM dead_letter_event
        WHERE id = $1
      `, [deadEventId]);

      await client.query("COMMIT");

      res.json({
        success: true
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      // increment retry count

      try {

        await client.query(`
          UPDATE dead_letter_event
          SET retry_count =
            retry_count + 1
          WHERE id = $1
        `, [req.params.id]);

      } catch (e) {

        console.error(
          "retry increment failed",
          e
        );

      }

      res.status(500).json({
        error: err.message
      });

    } finally {

      client.release();

    }

});


router.get(
  "/event-stream",

  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            sequence_number,
            id,
            identity_id,
            event_type,
            payload,
            created_at
          FROM event
          ORDER BY sequence_number DESC
          LIMIT 100
        `);

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "event_stream_fetch_failed"
      });

    }

});


router.get(
  "/event-stream/:identityId",

  async (req, res) => {

    try {

      const identityId =
        req.params.identityId;

      const result =
        await pool.query(`
          SELECT
            sequence_number,
            id,
            identity_id,
            event_type,
            payload,
            created_at
          FROM event
          WHERE identity_id = $1
          ORDER BY sequence_number ASC
        `, [identityId]);

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "entity_event_stream_failed"
      });

    }

});


router.get(
  "/projection-governance",
  async (req, res) => {

    try {

      // ===================================================
      // LATEST REPLAY
      // ===================================================

      const replayRes =
        await pool.query(`
          SELECT
            id,
            replay_type,
            replay_status,
            total_events,
            successful_events,
            failed_events,
            duration_ms,
            replay_throughput_eps,
            started_at,
            completed_at
          FROM replay_audit_log
          ORDER BY created_at DESC
          LIMIT 1
        `);

      // ===================================================
      // ACTIVE ALERTS
      // ===================================================

      const alertsRes =
        await pool.query(`
          SELECT
            projection_name,
            drift_status,
            severity,
            alert_message,
            detected_at
          FROM projection_drift_alert
          WHERE resolved_at IS NULL
          ORDER BY detected_at DESC
        `);

      // ===================================================
      // VALIDATION REPORT
      // ===================================================

      const validationRes =
        await pool.query(`
          SELECT
            projection_name,
            validation_status,
            severity,
            expected_sequence,
            actual_sequence,
            lag,
            projection_row_count,
            validated_at
          FROM replay_validation_report
          ORDER BY validated_at DESC
          LIMIT 20
        `);

      // ===================================================
      // SEVERITY COUNTS
      // ===================================================

      const severityRes =
        await pool.query(`
          SELECT
            severity,
            COUNT(*) AS count
          FROM projection_drift_alert
          WHERE resolved_at IS NULL
          GROUP BY severity
        `);

      // ===================================================
      // RESPONSE
      // ===================================================

      res.json({

        latest_replay:
          replayRes.rows[0] || null,

        active_alerts:
          alertsRes.rows,

        validation_reports:
          validationRes.rows,

        severity_summary:
          severityRes.rows

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "projection_governance_failed"

      });

    }

  }
);


router.get(

  "/replay-locks",

  async (req, res) => {

    try {

      const result =
        await pool.query(`

          SELECT

            id,
            lock_name,
            lock_status,
            acquired_at,
            released_at

          FROM replay_lock

          ORDER BY acquired_at DESC

        `);

      res.json(
        result.rows
      );

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "replay_locks_failed"

      });

    }

  }

);


router.get(

  "/projection-integrity",

  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const studentIntegrity =
        await verifyStudentActiveLessonIntegrity(
          client
        );

         const lessonLifecycleIntegrity =
          await verifyLessonLifecycleIntegrity(
           client
          );

      res.json({

  student_active_lesson_projection:
    studentIntegrity,

  lesson_lifecycle_stream:
    lessonLifecycleIntegrity

});

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "projection_integrity_failed"

      });

    }

    finally {

      client.release();

    }

  }

);


router.post(

  "/verify-incident-healing/:incidentId",

  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const {
        incidentId
      } = req.params;

      // ===============================================
      // LOAD INCIDENT
      // ===============================================

      const incidentRes =
        await client.query(`

          SELECT *

          FROM governance_incident

          WHERE id = $1

        `, [incidentId]);

      if (
        incidentRes.rowCount === 0
      ) {

        return res.status(404).json({

          error:
            "incident_not_found"

        });

      }

      const incident =
        incidentRes.rows[0];

      // ===============================================
      // RERUN STREAM INTEGRITY
      // ===============================================

      const integrity =
        await verifyLessonLifecycleIntegrity(
          client
        );

      // ===============================================
      // CHECK IF VIOLATION STILL EXISTS
      // ===============================================

      const stillExists =
        integrity.violations.some(

          v =>

            v.identity_id ===
              incident.affected_stream

            &&

            v.violation ===
              incident.violation_type

        );

      // ===============================================
      // AUTO-RESOLVE IF HEALED
      // ===============================================

      if (!stillExists) {

        await client.query(`

          UPDATE governance_incident

          SET

            governance_status = 'healed',

            resolved_at = NOW()

          WHERE id = $1

        `, [incidentId]);

      }

      res.json({

        healed:
          !stillExists

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "healing_verification_failed"

      });

    }

    finally {

      client.release();

    }

  }

);


router.get(

  "/governance-incidents",

  async (req, res) => {

    try {

      const result =
        await pool.query(`

          SELECT

            id,

            incident_type,

            severity,

            affected_stream,

            projection_name,

            violation_type,

            recommended_action,

            governance_status,

            detected_at

          FROM governance_incident

          ORDER BY detected_at DESC

        `);

      res.json(
        result.rows
      );

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "governance_incidents_failed"

      });

    }

  }

);



router.post(

  "/governance-incidents/:incidentId/resolve",

  async (req, res) => {

    try {

      const {
        incidentId
      } = req.params;

      await pool.query(`

        UPDATE governance_incident

        SET

          governance_status = 'resolved',

          resolved_at = NOW()

        WHERE id = $1

      `, [incidentId]);

      res.json({

        success: true

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "incident_resolution_failed"

      });

    }

  }

);



router.post(

  "/governance-incidents/:incidentId/acknowledge",

  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const {
        incidentId
      } = req.params;

      await client.query(`

        UPDATE governance_incident

        SET

          governance_status =
            'acknowledged'

        WHERE id = $1

      `, [incidentId]);

      await appendGovernanceTimelineEvent(

        client,

        {

          incidentId,

          timelineEvent:
            "incident_acknowledged"

        }

      );

      res.json({

        success: true

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "incident_acknowledge_failed"

      });

    }

    finally {

      client.release();

    }

  }

);


router.get(

  "/governance-metrics",

  async (req, res) => {

    try {

      const result =
        await pool.query(`

          SELECT

            COUNT(*) FILTER (
              WHERE governance_status = 'open'
            ) AS open_incidents,

            COUNT(*) FILTER (
              WHERE severity = 'critical'
            ) AS critical_incidents,

            COUNT(*) FILTER (
              WHERE governance_status = 'healed'
            ) AS healed_incidents,

            COUNT(*) FILTER (
              WHERE governance_status = 'resolved'
            ) AS resolved_incidents,

            COUNT(*) FILTER (
              WHERE governance_status =
                'remediation_in_progress'
            ) AS active_remediations

          FROM governance_incident

        `);

      res.json(
        result.rows[0]
      );

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "governance_metrics_failed"

      });

    }

  }

);


router.post(

  "/governance-incidents/resolve-all",

  async (req, res) => {

    try {

      await pool.query(`

        UPDATE governance_incident

        SET

          governance_status = 'resolved',

          resolved_at = NOW()

        WHERE governance_status != 'resolved'

      `);

      res.json({

        success: true

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "bulk_resolution_failed"

      });

    }

  }

);

router.post(

  "/governance-incidents/:incidentId/remediation-started",

  async (req, res) => {

    try {

      const {
        incidentId
      } = req.params;

      await pool.query(`

        UPDATE governance_incident

        SET

          governance_status =
            'remediation_in_progress'

        WHERE id = $1

      `, [incidentId]);

      res.json({

        success: true

      });

    }

    catch (err) {

      console.error(err);

      res.status(500).json({

        error:
          "remediation_start_failed"

      });

    }

  }

);


router.post(

  "/replay-projection/:projectionName",

  async (req, res) => {

    const {
      projectionName
    } = req.params;

    const client =
      await pool.connect();

    try {

      console.log(
        `🔁 API REPLAY REQUEST: ${projectionName}`
      );

      await client.query("BEGIN");

      const result =
        await replaySingleProjection(

          client,
          projectionName

        );

      await client.query("COMMIT");

      res.json({

        success: true,

        result

      });

    }

    catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({

        error:
          "single_projection_replay_failed",

        details:
          err.message

      });

    }

    finally {

      client.release();

    }

  }

);


export default router;
