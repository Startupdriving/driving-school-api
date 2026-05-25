import {

  appendGovernanceTimelineEvent

} from "./governanceTimelineService.js";


export async function createGovernanceIncident(

  client,

  incident

) {

  // ===================================================
  // DEDUP CHECK
  // ===================================================

  const existing =
    await client.query(`

      SELECT id

      FROM governance_incident

      WHERE

        violation_type = $1

      AND affected_stream = $2

      AND governance_status = 'open'

      LIMIT 1

    `, [

      incident.violation_type,

      incident.affected_stream

    ]);

  // ===================================================
  // ALREADY OPEN
  // ===================================================

  if (existing.rowCount > 0) {

    return;

  }

  // ===================================================
  // CREATE INCIDENT
  // ===================================================
const incidentRes =
  await client.query(`

    INSERT INTO governance_incident (

      incident_type,

      severity,

      affected_stream,

      projection_name,

      violation_type,

      recommended_action,

      incident_payload

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
  RETURNING id

  `, [

    incident.incident_type,

    incident.severity,

    incident.affected_stream,

    incident.projection_name,

    incident.violation_type,

    incident.recommended_action,

    JSON.stringify(
      incident.payload || {}
    )

  ]);

const incidentId =
  incidentRes.rows[0].id;

   await appendGovernanceTimelineEvent(

  client,

  {

    incidentId,

    timelineEvent:
      "incident_opened",

    payload: {

      violation_type:
        incident.violation_type

    }

  }

);
}

