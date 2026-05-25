export async function ensureInstructorReliability(
  client,
  instructorId
) {

  await client.query(`
    INSERT INTO instructor_reliability_projection (
      instructor_id
    )
    VALUES ($1)
    ON CONFLICT (instructor_id)
    DO NOTHING
  `, [instructorId]);

}



export async function recalculateReliability(
  client,
  instructorId
) {

  const rs = await client.query(`
    SELECT *
    FROM instructor_reliability_projection
    WHERE instructor_id = $1
    LIMIT 1
  `, [instructorId]);

  if (rs.rowCount === 0) return;

  const row = rs.rows[0];

  let score = 100;

  score += row.completed_lessons * 2;

  score -= row.cancelled_lessons * 5;

  score -= row.reschedules_requested * 1;

  score -= row.reschedules_rejected * 2;

  if (score < 0) {
    score = 0;
  }

  await client.query(`
    UPDATE instructor_reliability_projection
    SET
      reliability_score = $1,
      updated_at = NOW()
    WHERE instructor_id = $2
  `, [
    score,
    instructorId
  ]);

}
