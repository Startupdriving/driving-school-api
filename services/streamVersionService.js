export async function getCurrentStreamVersion(
  client,
  identityId
) {

  const result =
    await client.query(`
      SELECT COALESCE(
        MAX(stream_version),
        0
      ) AS current_version
      FROM event
      WHERE identity_id = $1
    `, [identityId]);

  return Number(
    result.rows[0]
      .current_version
  );

}
