export async function registerProjectionEvent(
  client,
  projectionName,
  eventId
) {

  const result =
    await client.query(`
      INSERT INTO projection_event_log (
        projection_name,
        event_id
      )
      VALUES ($1, $2)

      ON CONFLICT DO NOTHING

      RETURNING event_id
    `, [
      projectionName,
      eventId
    ]);

  return result.rowCount > 0;

}



export async function
hasProjectionEventProcessed(
  client,
  projectionName,
  eventId
) {

  const { rows } =
    await client.query(`
      SELECT 1
      FROM projection_event_log
      WHERE projection_name = $1
      AND event_id = $2
      LIMIT 1
    `, [
      projectionName,
      eventId
    ]);

  return rows.length > 0;

}
