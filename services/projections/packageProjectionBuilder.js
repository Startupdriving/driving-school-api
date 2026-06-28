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
      return onPackageCreated(
        client,
        event,
        replay
      );

    case "package_updated":
      return onPackageUpdated(
        client,
        event,
        replay
    );

    case "package_deactivated":
      return onPackageDeactivated(
        client,
        event,
        replay
    );

  }

}

async function onPackageCreated(
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



async function onPackageUpdated(
  client,
  event,
  replay
) {

  const payload =
    event.payload;


  await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {


      await client.query(`

        UPDATE package_projection

        SET

          name = $2,

          lesson_count = $3,

          lesson_duration_minutes = $4,

          base_price = $5,

          service_mode = $6,

          updated_at = $7

        WHERE package_id = $1

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



async function onPackageDeactivated(
  client,
  event,
  replay
) {

  await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

        UPDATE package_projection

        SET

          is_active = FALSE,

          updated_at = $2

        WHERE package_id = $1

      `, [

        event.identity_id,

        event.created_at

      ]);

    }

  });


}
