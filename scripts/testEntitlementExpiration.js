import pool from "../db.js";

import {
  expireEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  expireEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";


const studentId =
  "35eedc2a-0509-44b2-92aa-b25ecd2ccc29";


const client =
  await pool.connect();


try {

  await client.query("BEGIN");

  const command =
    expireEntitlementCommand({

      studentId,

      credits:
        1,

      expiredBy:
        "SYSTEM",

      reason:
        "PACKAGE_EXPIRED"

    });


  const event =
    await expireEntitlement(
      client,
      command
    );


  console.log(
    "EXPIRED EVENT:",
    event
  );


  await client.query("COMMIT");

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
