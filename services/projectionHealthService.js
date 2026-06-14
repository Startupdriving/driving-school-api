export async function getProjectionHealth(
  client
) {

  const result =
    await client.query(`
      SELECT
        pc.projection_name,
        pc.last_processed_sequence,

        (
          SELECT COALESCE(MAX(sequence_number),0)
          FROM event
        ) AS latest_event_sequence,

        (
          SELECT COALESCE(MAX(sequence_number),0)
          FROM event
        ) - pc.last_processed_sequence
        AS lag

      FROM projection_checkpoint pc

      ORDER BY lag DESC
    `);

  return result.rows;

}
