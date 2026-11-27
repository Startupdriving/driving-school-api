import crypto from "crypto";

import {
  insertEvent
} from "./eventStore.js";
import {
  createEntitlementCommand
} from "./commands/entitlementCommands.js";

import {
  createEntitlement
} from "./aggregates/studentEntitlementAggregate.js";





export async function createEnrollment(
  client,
  data
) {

  const studentRes =
    await client.query(`
      SELECT 1
      FROM students
      WHERE id = $1
      LIMIT 1
    `, [
      data.student_id
    ]);

console.log(
  "STUDENT VALIDATION:",
  studentRes.rowCount
);

  if (
    studentRes.rowCount === 0
  ) {
    throw new Error(
      "student_not_found"
    );
  }


  const packageRes =
    await client.query(`
      SELECT

     package_id,

    lesson_count

    FROM package_projection

    WHERE package_id = $1

    AND is_active = TRUE

    LIMIT 1
    `, [
      data.package_id
    ]);

console.log(
  "PACKAGE VALIDATION:",
  packageRes.rowCount
);

  if (
    packageRes.rowCount === 0
  ) {
    throw new Error(
      "package_not_found_or_inactive"
    );
  }


const lessonCredits =
  packageRes.rows[0].lesson_count;

  const enrollmentId =
    crypto.randomUUID();


   await client.query(`
  INSERT INTO identity (
    id,
    identity_type
  )
  VALUES (
    $1,
    'enrollment'
  )
`, [
  enrollmentId
]);


  const event =
    await insertEvent(
      client,
      {
        id:
          crypto.randomUUID(),

        identity_id:
          enrollmentId,

        aggregate_type:
          "enrollment",


        event_type:
          "enrollment_created",

        payload: {

          student_id:
            data.student_id,

          package_id:
            data.package_id

        }

      }
    );

const command =
  createEntitlementCommand({

    studentId:
      data.student_id,

    enrollmentId:
      enrollmentId,

    packageId:
      data.package_id,

    credits:
      lessonCredits,

    createdBy:
      "SYSTEM",

    reason:
      "PACKAGE_PURCHASE"

  });


await createEntitlement(

  client,

  command

);

  return event;

}



export async function cancelEnrollment(
  client,
  enrollment_id
) {

  const event =
    await insertEvent(
      client,
      {
        id:
          crypto.randomUUID(),

        identity_id:
          enrollment_id,

        event_type:
          "enrollment_cancelled",

        payload: {}
      }
    );

  return event;

}


export async function completeEnrollment(
  client,
  enrollment_id
) {

  const event =
    await insertEvent(
      client,
      {
        id:
          crypto.randomUUID(),

        identity_id:
          enrollment_id,

        event_type:
          "enrollment_completed",

        payload: {}
      }
    );

  return event;

}
