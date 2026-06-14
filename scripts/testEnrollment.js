import pool from "../db.js";

import {
  createEnrollment
} from "../services/enrollmentService.js";

const client =
  await pool.connect();

try {

  await client.query("BEGIN");

  const event =
    await createEnrollment(
      client,
      {

        student_id:
          "35eedc2a-0509-44b2-92aa-b25ecd2ccc29",

        package_id:
          "1025d56a-f9f5-4130-b98a-286563ec471b"

      }
    );

  await client.query("COMMIT");
const verify = await client.query(`
  SELECT
    sequence_number,
    event_type,
    processed
  FROM event
  WHERE sequence_number >= 129
  ORDER BY sequence_number DESC
  LIMIT 5
`);

console.log(
  "AFTER COMMIT EVENTS:",
  verify.rows
);
  console.log(event);

} catch (err) {

  await client.query("ROLLBACK");

  console.error(err);

} finally {

  client.release();

}
