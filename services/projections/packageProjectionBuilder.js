import {
  processProjectionEvent
} from "../projectionPipelineService.js";

export async function apply(
  client,
  event,
  replay
) {

  switch (event.event_type) {

    case "package_created":
      return applyPackageCreated(
        client,
        event,
        replay
      );

    case "package_updated":
      return;

    case "package_deactivated":
      return;

  }

}

async function applyPackageCreated(
  client,
  event,
  replay
) {



const payload = event.payload;


 await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {

    await client.query(`

        INSERT INTO package_projection (

          package_id,

          name,

          lesson_count,

                    lesson_duration_minutes,

          base_price,

          service_mode,

          is_active,

          created_at,

          updated_at

        )

        VALUES (

          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          TRUE,
          $7,
          $7

        )

        ON CONFLICT (package_id)

        DO NOTHING

      `, [

        event.identity_id,

        payload.name,

        payload.lesson_count,

        payload.lesson_duration_minutes,

        payload.base_price,

        payload.service_mode,

        event.created_at

      ]);

    }

  });
}
