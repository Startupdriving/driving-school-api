import {
  rebuildState
} from "./studentEntitlementStateBuilder.js";
import {
  createEvent
} from "../events/eventFactory.js";
import { insertEvent } from "../eventStore.js";
import {
  loadAggregateEvents
} from "../eventStore.js";


async function handleCreateEntitlement(
  client,
  command
) {

  const events = [];

  const state =
    rebuildState(events);

if (
  state.studentId &&
  state.studentId !== command.studentId
) {

  throw new Error(
    "aggregate_identity_mismatch"
  );
}

 if (
    command.credits <= 0
  ) {


  throw new Error(
    "invalid_entitlement_credits"
  );

}

await client.query(`

  INSERT INTO identity (

    id,

    identity_type

  )

  VALUES (

    $1,

    'student_entitlement'

  )

  ON CONFLICT (id)

  DO NOTHING

`, [

  command.studentId

]);


const payload = {

  student_id:
    command.studentId,

  enrollment_id:
    command.enrollmentId,

  package_id:
    command.packageId,

  credits:
    command.credits,

  created_by:
    command.createdBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_created",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;

}




export async function createEntitlement(
  client,
  command
) {

  return handleCreateEntitlement(
    client,
    command
  );

}


export async function reserveEntitlement(
  client,
  command
) {

  return handleReserveEntitlement(
    client,
    command
  );

}

export async function releaseEntitlement(
  client,
  command
) {

  return handleReleaseEntitlement(
    client,
    command
  );

}



async function handleReserveEntitlement(
  client,
  command
) {

  const events =
    await loadAggregateEvents(
      client,
      command.studentId
    );

  const state =
    rebuildState(events);

if (
  !state.studentId
) {

  throw new Error(
    "entitlement_not_found"
  );

}

if (
  command.credits <= 0
) {

  throw new Error(
    "invalid_reserved_credits"
  );

}

if (
  state.availableCredits <
  command.credits
) {

  throw new Error(
    "insufficient_available_credits"
  );

}

const payload = {

  student_id:
    command.studentId,

  lesson_id:
    command.lessonId,

  credits:
    command.credits,

  reserved_by:
    command.reservedBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_reserved",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;

}


async function handleReleaseEntitlement(
  client,
  command
) {

  const events =
    await loadAggregateEvents(
      client,
      command.studentId
    );

  const state =
    rebuildState(events);

if (
  !state.studentId
) {

  throw new Error(
    "entitlement_not_found"
  );

}

if (
  command.credits <= 0
) {

  throw new Error(
    "invalid_released_credits"
  );

}

if (
  state.reservedCredits <
  command.credits
) {

  throw new Error(
    "insufficient_reserved_credits"
  );

}

const payload = {

  student_id:
    command.studentId,

  lesson_id:
    command.lessonId,

  credits:
    command.credits,

  released_by:
    command.releasedBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_released",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;

}


async function handleConsumeEntitlement(
  client,
  command
) {

  const events =
    await loadAggregateEvents(
      client,
      command.studentId
    );

const state =
  rebuildState(events);

if (
  !state.studentId
) {

  throw new Error(
    "entitlement_not_found"
  );

}

if (
  command.credits <= 0
) {

  throw new Error(
    "invalid_consumed_credits"
  );

}

if (
  state.reservedCredits <
  command.credits
) {

  throw new Error(
    "insufficient_reserved_credits"
  );

}

const payload = {

  student_id:
    command.studentId,

  lesson_id:
    command.lessonId,

  credits:
    command.credits,

  consumed_by:
    command.consumedBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_consumed",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;
}


async function handleExpireEntitlement(
  client,
  command
) {

  const events =
    await loadAggregateEvents(
      client,
      command.studentId
    );

  const state =
    rebuildState(events);

if (
  !state.studentId
) {

  throw new Error(
    "entitlement_not_found"
  );

}

if (
  command.credits <= 0
) {

  throw new Error(
    "invalid_expired_credits"
  );

}

if (
  state.availableCredits <
  command.credits
) {

  throw new Error(
    "insufficient_available_credits"
  );

}

const payload = {

  student_id:
    command.studentId,

  credits:
    command.credits,

  expired_by:
    command.expiredBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_expired",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;

}


async function handleAdjustEntitlement(
  client,
  command
) {

  const events =
    await loadAggregateEvents(
      client,
      command.studentId
    );

  const state =
    rebuildState(events);

if (
  !state.studentId
) {

  throw new Error(
    "entitlement_not_found"
  );

}

if (
  command.adjustment === 0
) {

  throw new Error(
    "invalid_entitlement_adjustment"
  );

}

if (
  command.adjustment < 0 &&
  state.availableCredits <
    Math.abs(command.adjustment)
) {

  throw new Error(
    "insufficient_available_credits"
  );

}

const payload = {

  student_id:
    command.studentId,

  adjustment:
    command.adjustment,

  adjusted_by:
    command.adjustedBy,

  reason:
    command.reason

};

const event =
  createEvent({

    identityId:
      command.studentId,

    aggregateType:
      "student_entitlement",

    eventType:
      "entitlement_adjusted",

    payload

  });

const persistedEvent =
  await insertEvent(
    client,
    {

      id:
        event.id,

      identity_id:
        event.identityId,

      aggregate_type:
        event.aggregateType,

      event_type:
        event.eventType,

      payload:
        event.payload

    }
  );

return persistedEvent;


}


export async function consumeEntitlement(
  client,
  command
) {

  return handleConsumeEntitlement(
    client,
    command
  );

}


export async function expireEntitlement(
  client,
  command
) {

  return handleExpireEntitlement(
    client,
    command
  );

}


export async function adjustEntitlement(
  client,
  command
) {

  return handleAdjustEntitlement(
    client,
    command
  );

}
