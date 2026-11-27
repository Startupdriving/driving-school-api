import pool from "../db.js";

import crypto from "crypto";

import {
  reserveEntitlementCommand,
  consumeEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  reserveEntitlement,
  consumeEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";


const studentId =
  "35eedc2a-0509-44b2-92aa-b25ecd2ccc29";

const lessonId =
  "da6cf0e8-df21-4153-90bc-0eefbd882a8b";


const client =
  await pool.connect();


try {

  await client.query("BEGIN");

  const reserveCommand =
  reserveEntitlementCommand({

    studentId,

    lessonId,

    credits:
      1,

    reservedBy:
      "SYSTEM",

    reason:
      "LESSON_BOOKED"

  });


const reservedEvent =
  await reserveEntitlement(
    client,
    reserveCommand
  );


console.log(
  "RESERVED EVENT:",
  reservedEvent
);

const consumeCommand =
  consumeEntitlementCommand({

    studentId,

    lessonId,

    credits:
      1,

    consumedBy:
      "SYSTEM",

    reason:
      "LESSON_COMPLETED"

  });


const consumedEvent =
  await consumeEntitlement(
    client,
    consumeCommand
  );


console.log(
  "CONSUMED EVENT:",
  consumedEvent
);

  await client.query("COMMIT");

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
