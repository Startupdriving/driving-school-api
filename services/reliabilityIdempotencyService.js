export async function registerReliabilityEvent(
  client,
  {
    event_id,
    instructor_id,
    metric_type
  }
) {

  const result =
    await client.query(`

      INSERT INTO
      instructor_reliability_event_log (

        event_id,
        instructor_id,
        metric_type

      )

      VALUES ($1,$2,$3)

      ON CONFLICT (event_id)

      DO NOTHING

      RETURNING event_id

  `, [
    event_id,
    instructor_id,
    metric_type
  ]);

  return result.rowCount > 0;

}
