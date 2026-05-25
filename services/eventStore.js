import {
  validateEventGovernance
} from "./eventGovernanceService.js";


export async function insertEvent(client, {
  id,
  identity_id,
  event_type,
  payload,

  correlation_id = null,
  causation_id = null,
  expected_version = null,

  instructor_id = null,
  lesson_range = null
}) {

    await validateEventGovernance(
    client,
    {
      identity_id,
      event_type,
      causation_id
    }
  );


const versionRes =
  await client.query(`
    SELECT COALESCE(
      MAX(stream_version),
      0
    ) AS current_version
    FROM event
    WHERE identity_id = $1
  `, [identity_id]);

const currentVersion =
  Number(
    versionRes.rows[0]
      .current_version
  );

if (
  expected_version !== null &&
  currentVersion !== expected_version
) {

  throw new Error(
    `concurrency_conflict:expected=${expected_version}:actual=${currentVersion}`
  );

}

const nextVersion =
  currentVersion + 1;


  const { rows } =
  await client.query(`
    INSERT INTO event (
  id,
  identity_id,
  event_type,
  payload,
  correlation_id,
  causation_id,
  instructor_id,
  lesson_range,
  stream_version
)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *
  `, [
  id,
  identity_id,
  event_type,
  payload,
  correlation_id,
  causation_id,
  instructor_id,
  lesson_range,
  nextVersion
]);

  console.log("📡 EVENT INSERTED:", event_type);

   return rows[0];

}
