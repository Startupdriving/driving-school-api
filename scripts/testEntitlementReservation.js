import pool from "../db.js";
import {
  reserveEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  reserveEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";
import crypto from "crypto";


const lessonId =
  crypto.randomUUID();

const client =
  await pool.connect();

try {

  await client.query("BEGIN");

  const command =
  reserveEntitlementCommand({

    studentId:
      "35eedc2a-0509-44b2-92aa-b25ecd2ccc29",

    lessonId,

    credits:
      1,

    reservedBy:
      "SYSTEM",

    reason:
      "LESSON_BOOKED"

  });

const event =
  await reserveEntitlement(
    client,
    command
  );

console.log(event);

  await client.query("COMMIT");

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
