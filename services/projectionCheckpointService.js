export async function updateProjectionCheckpoint(
  client,
  projectionName,
  sequenceNumber
) {

  await client.query(`
    INSERT INTO projection_checkpoint (
      projection_name,
      last_processed_sequence,
      last_processed_at,
      replay_completed,
      updated_at
    )

    VALUES (
      $1,
      $2,
      NOW(),
      TRUE,
      NOW()
    )

    ON CONFLICT (projection_name)

    DO UPDATE SET
      last_processed_sequence =
        GREATEST(
          projection_checkpoint.last_processed_sequence,
          EXCLUDED.last_processed_sequence
        ),

      last_processed_at = NOW(),

      updated_at = NOW()
  `, [
    projectionName,
    sequenceNumber
  ]);

}
