import {
  registerProjectionEvent,
  hasProjectionEventProcessed
} from "./projectionIdempotencyService.js";

import {
  assertProjectionOrdering
} from "./projectionOrderingService.js";

import {
  updateProjectionCheckpoint
} from "./projectionCheckpointService.js";


export async function processProjectionEvent({

  client,

  projectionName,

  event,

  replay = false,

  processor

}) {

  const seq =
    Number(event.sequence_number);


  const alreadyProcessed =
  await hasProjectionEventProcessed(
    client,
    projectionName,
    event.id
  );

if (alreadyProcessed) {

  console.log(
    `♻ SKIP DUPLICATE ${projectionName}:`,
    event.id
  );

  return false;
}

  await assertProjectionOrdering(
    client,
    projectionName,
    seq,
    replay
  );

  await processor();

  await updateProjectionCheckpoint(
    client,
    projectionName,
    seq
  );



     const shouldProcess =
    await registerProjectionEvent(
      client,
      projectionName,
      event.id
    );

  return true;

}
