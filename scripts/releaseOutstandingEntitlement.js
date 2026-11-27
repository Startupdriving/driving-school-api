import pool from "../db.js";

import {
  releaseEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  releaseEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";


const studentId =
  "35eedc2a-0509-44b2-92aa-b25ecd2ccc29";

const lessonId =
  "da6cf0e8-df21-4153-90bc-0eefbd882a8b";


const client =
  await pool.connect();

try {

  await client.query("BEGIN");

  const command =
    releaseEntitlementCommand({

      studentId,

      lessonId,

      credits:
        1,

      releasedBy:
        "SYSTEM",

      reason:
        "TEST_RESERVATION_CLEANUP"

    });


  const event =
    await releaseEntitlement(
      client,
      command
    );


  console.log(
    "RELEASED OUTSTANDING RESERVATION:",
    event
  );


  await client.query("COMMIT");

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
