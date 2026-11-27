import {
  processProjectionEvent
} from "../projectionPipelineService.js";

export async function apply(
  client,
  event,
  replay
) {

  switch (event.event_type) {

    case "enrollment_created":
      return onEnrollmentCreated(
        client,
        event,
        replay
      );

    case "enrollment_cancelled":

       return onEnrollmentCancelled(
          client,
          event,
          replay
       );

    case "enrollment_completed":
      return;

    default:
      return;

  }

}

async function onEnrollmentCreated(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "enrollment_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

        INSERT INTO enrollment_projection (

          enrollment_id,
          student_id,

          package_id,

          status,

          created_at,

          updated_at

        )

        VALUES (

          $1,
          $2,
          $3,

          'ACTIVE',

          $4,
          $4
         )

      `, [

        event.identity_id,

        payload.student_id,

        payload.package_id,

        event.created_at

      ]);

    }

  });

}


async function onEnrollmentCancelled(
    client,
    event,
    replay
){



}
