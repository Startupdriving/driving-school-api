import pool from "../db.js";
import {
  releaseEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  releaseEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";
import crypto from "crypto";

const lessonId =
  crypto.randomUUID();

const client =
  await pool.connect();

try {

  await client.query("BEGIN");

    const command =
  releaseEntitlementCommand({

    studentId:
      "35eedc2a-0509-44b2-92aa-b25ecd2ccc29",

    lessonId,

    credits:
      1,

    releasedBy:
      "SYSTEM",

    reason:
      "LESSON_CANCELLED"

  });

const event =
  await releaseEntitlement(
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
