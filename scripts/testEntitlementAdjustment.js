import pool from "../db.js";

import {
  adjustEntitlementCommand
} from "../services/commands/entitlementCommands.js";

import {
  adjustEntitlement
} from "../services/aggregates/studentEntitlementAggregate.js";


const studentId =
  "35eedc2a-0509-44b2-92aa-b25ecd2ccc29";


const client =
  await pool.connect();


try {

  await client.query("BEGIN");

  const command =
    adjustEntitlementCommand({

      studentId,

      adjustment:
        2,

      adjustedBy:
        "SYSTEM",

      reason:
        "ADMIN_CORRECTION"

    });


  const event =
    await adjustEntitlement(
      client,
      command
    );


  console.log(
    "ADJUSTED EVENT:",
    event
  );


  await client.query("COMMIT");

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
