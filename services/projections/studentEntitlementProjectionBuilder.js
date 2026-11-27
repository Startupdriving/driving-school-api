import {
  processProjectionEvent
} from "../projectionPipelineService.js";


const eventHandlers = {

  entitlement_created:
    onEntitlementCreated,

  entitlement_reserved:
    onEntitlementReserved,

  entitlement_released:
    onEntitlementReleased,

  entitlement_consumed:
    onEntitlementConsumed,

  entitlement_expired:
    onEntitlementExpired,

  entitlement_adjusted:
    onEntitlementAdjusted

};

export async function apply(
  client,
  event,
  replay
) {

  const handler =
    eventHandlers[
      event.event_type
    ];

  if (!handler) {

    return;

  }

  return handler(
    client,
    event,
    replay
  );

}

async function onEntitlementCreated(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

        await client.query(

        `

       INSERT INTO student_entitlement_projection (

    student_id,

    total_created_credits,

    available_credits,

    reserved_credits,

    consumed_credits,

    expired_credits,

    adjustment_credits,

    updated_at,

    last_transaction_at,

    last_event_sequence,

    last_event_type

)

VALUES (

    $1,

    $2,

    $2,

    0,

    0,

    0,

    0,

    $3,

    $3,

    $4,

    $5

)

ON CONFLICT (student_id)

DO UPDATE

SET

    total_created_credits =
        student_entitlement_projection.total_created_credits
        + EXCLUDED.total_created_credits,

    available_credits =
        student_entitlement_projection.available_credits
        + EXCLUDED.available_credits,

    updated_at =
        EXCLUDED.updated_at,

    last_transaction_at =
        EXCLUDED.last_transaction_at,

    last_event_sequence =
        EXCLUDED.last_event_sequence,

    last_event_type =
        EXCLUDED.last_event_type`,

     [

      payload.student_id,

      payload.credits,

      event.created_at,

      event.sequence_number,

      event.event_type
    ]

  );
    }

  });

}


async function onEntitlementReserved(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

await client.query(`

UPDATE student_entitlement_projection

SET

    available_credits =
        available_credits - $2,

    reserved_credits =
        reserved_credits + $2,

    updated_at =
        $3,

    last_transaction_at =
        $3,

    last_event_sequence =
        $4,

    last_event_type =
        $5

WHERE student_id = $1

`, [

    payload.student_id,

    payload.credits,

    event.created_at,

    event.sequence_number,

    event.event_type

]);

    }

  });

}


async function onEntitlementReleased(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

UPDATE student_entitlement_projection

SET

    available_credits =
        available_credits + $2,

    reserved_credits =
        reserved_credits - $2,

    updated_at =
        $3,

    last_transaction_at =
        $3,

    last_event_sequence =
        $4,

    last_event_type =
        $5

WHERE student_id = $1

      `, [

        payload.student_id,

        payload.credits,

        event.created_at,

        event.sequence_number,

        event.event_type

      ]);

    }

  });

}


async function onEntitlementConsumed(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

UPDATE student_entitlement_projection

SET

    reserved_credits =
        reserved_credits - $2,

    consumed_credits =
        consumed_credits + $2,

    updated_at =
        $3,

    last_transaction_at =
        $3,

    last_event_sequence =
        $4,

    last_event_type =
        $5

WHERE student_id = $1

      `, [

        payload.student_id,

        payload.credits,

        event.created_at,

        event.sequence_number,

        event.event_type

      ]);

    }

  });

}



async function onEntitlementExpired(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

UPDATE student_entitlement_projection

SET

    available_credits =
        available_credits - $2,

    expired_credits =
        expired_credits + $2,

    updated_at =
        $3,

    last_transaction_at =
        $3,

    last_event_sequence =
        $4,

    last_event_type =
        $5

WHERE student_id = $1

      `, [

        payload.student_id,

        payload.credits,

        event.created_at,

        event.sequence_number,

        event.event_type

      ]);

    }

  });

}

async function onEntitlementAdjusted(
  client,
  event,
  replay
) {

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "student_entitlement_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

UPDATE student_entitlement_projection

SET

    available_credits =
        available_credits + $2,

    adjustment_credits =
        adjustment_credits + $2,

    updated_at =
        $3,

    last_transaction_at =
        $3,

    last_event_sequence =
        $4,

    last_event_type =
        $5

WHERE student_id = $1

      `, [

        payload.student_id,

        payload.adjustment,

        event.created_at,

        event.sequence_number,

        event.event_type

      ]);

    }

  });

}
