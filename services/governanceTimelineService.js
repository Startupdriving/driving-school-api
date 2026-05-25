export async function appendGovernanceTimelineEvent(

  client,

  {

    incidentId,

    timelineEvent,

    payload = {}

  }

) {

  await client.query(`

    INSERT INTO governance_incident_timeline (

      incident_id,

      timeline_event,

      timeline_payload

    )

    VALUES (

      $1,
      $2,
      $3

    )

  `, [

    incidentId,

    timelineEvent,

    JSON.stringify(payload)

  ]);

}
