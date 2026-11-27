import crypto from "crypto";

export function createEvent({

  identityId,

  aggregateType,

  eventType,

  payload,

  correlationId = null,

  causationId = null

}) {

  return {

    id:
      crypto.randomUUID(),

    identityId,

    aggregateType,

    eventType,

    payload,

    correlationId,

    causationId,

    createdAt:
      new Date()

  };

}
