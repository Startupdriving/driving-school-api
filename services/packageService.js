import crypto from "crypto";
import { withIdempotency } from "./idempotencyService.js";
import { insertEvent } from "./eventStore.js";

function generateUUID() {
  return crypto.randomUUID();
}

export async function createPackage(req, res) {
  try {

    const response = await withIdempotency(
      req,
      async (client) => {

        const {
          name,
          lesson_count,
          lesson_duration_minutes,
          base_price,
          service_mode
        } = req.body;

        // =====================================================
        // VALIDATION
        // =====================================================

        if (
          !name ||
          lesson_count === undefined ||
          lesson_duration_minutes === undefined ||
          base_price === undefined ||
          !service_mode
        ) {
          throw new Error(
            "name, lesson_count, lesson_duration_minutes, base_price, service_mode required"
          );
        }

        if (lesson_count <= 0) {
          throw new Error(
            "lesson_count_must_be_positive"
          );
        }

        if (lesson_duration_minutes <= 0) {
          throw new Error(
            "lesson_duration_minutes_must_be_positive"
          );
        }

        if (base_price < 0) {
          throw new Error(
            "base_price_cannot_be_negative"
          );
        }

        if (
          ![
            "doorstep",
            "pickup_point",
            "hybrid"
          ].includes(service_mode)
        ) {
          throw new Error(
            "invalid_service_mode"
          );
        }

        // =====================================================
        // CREATE PACKAGE AGGREGATE
        // =====================================================

        const packageId =
          generateUUID();

        const rootEventId =
          generateUUID();

        await client.query(`
          INSERT INTO identity (
            id,
            identity_type
          )
          VALUES (
            $1,
            'package'
          )
        `, [packageId]);

        // =====================================================
        // PACKAGE CREATED EVENT
        // =====================================================

  const event =  await insertEvent(client, {

          id:
            rootEventId,

          identity_id:
            packageId,

          event_type:
            "package_created",

          correlation_id:
            rootEventId,

          causation_id:
            null,

          payload: {

            name,

            lesson_count,

            lesson_duration_minutes,

            base_price,

            service_mode

          }

        });

    console.log(
  "NEW PACKAGE EVENT:",
  event.sequence_number,
  event.processed
);

        return {

          status:
            "created",

          package_id:
            packageId

        };

      }
    );

    res
      .status(201)
      .json(response);

  } catch (err) {

    console.error(
      "CREATE PACKAGE ERROR:",
      err
    );

    res.status(400).json({
      error: err.message
    });

  }
}


export async function updatePackage(
  client,
  {
    package_id,
    name,
    lesson_count,
    lesson_duration_minutes,
    base_price,
    service_mode
  }
) {

  const event =
    await insertEvent(
      client,
      {
        id: crypto.randomUUID(),

        identity_id:
          package_id,

        event_type:
          "package_updated",

        payload: {

          name,

          lesson_count,

          lesson_duration_minutes,

          base_price,

          service_mode

        }
      }
    );

const verify =
    await client.query(`
      SELECT
        sequence_number,
        processed,
        failed
      FROM event
      WHERE id = $1
    `, [event.id]);

const verify2 =
  await client.query(`
    SELECT
      sequence_number,
      processed
    FROM event
    WHERE id = $1
  `, [event.id]);

  console.log(
    "PACKAGE UPDATED EVENT:",
    event.sequence_number
  );

  return event;

}



export async function deactivatePackage(
  client,
  package_id
) {

  const event =
    await insertEvent(
      client,
      {
        id: crypto.randomUUID(),

        identity_id:
          package_id,

        event_type:
          "package_deactivated",

        payload: {}
      }
    );

  return event;

}


export async function updatePackageHandler(
  req,
  res
) {

  try {

    const response =
      await withIdempotency(
        req,
        async (client) => {

          const result =
            await updatePackage(
              client,
              req.body
            );

          return {
            status: "updated",
            event_id: result.id
          };

        }
      );

    res.json(response);

  } catch (err) {

    console.error(
      "UPDATE PACKAGE ERROR:",
      err
    );

    res.status(400).json({
      error: err.message
    });

  }

}


export async function deactivatePackageHandler(
  req,
  res
) {

  try {

    const response =
      await withIdempotency(
        req,
        async (client) => {

          const result =
            await deactivatePackage(
              client,
              req.body.package_id
            );

          return {
            status: "deactivated",
            event_id: result.id
          };

        }
      );

    res.json(response);

  } catch (err) {

    console.error(
      "DEACTIVATE PACKAGE ERROR:",
      err
    );

    res.status(400).json({
      error: err.message
    });

  }

}
