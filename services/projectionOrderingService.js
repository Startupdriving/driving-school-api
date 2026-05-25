export async function assertProjectionOrdering(
  client,
  projectionName,
  sequenceNumber,
  replay = false
) {

if (replay) {
  return;
}

  const result =
    await client.query(`
      SELECT
        last_processed_sequence
      FROM projection_checkpoint
      WHERE projection_name = $1
      LIMIT 1
    `, [projectionName]);

  if (result.rowCount === 0) {
    return;
  }

  const lastSequence =
    Number(
      result.rows[0]
        .last_processed_sequence
    );

  if (sequenceNumber <= lastSequence) {

    throw new Error(
      `projection_out_of_order:${projectionName}:incoming=${sequenceNumber}:last=${lastSequence}`
    );

  }

}
