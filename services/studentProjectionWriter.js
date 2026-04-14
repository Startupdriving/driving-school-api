async function upsertStudentState(connection, data) {
  await connection.query(`
    INSERT INTO student_active_lesson_projection (
      student_id,
      lesson_request_id,
      lesson_id,
      instructor_id,
      status,
      requested_at,
      confirmed_at,
      started_at,
      completed_at,
      cancelled_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
      lesson_request_id = EXCLUDED.lesson_request_id,
      lesson_id = EXCLUDED.lesson_id,
      instructor_id = EXCLUDED.instructor_id,
      status = EXCLUDED.status,
      requested_at = EXCLUDED.requested_at,
      confirmed_at = EXCLUDED.confirmed_at,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      cancelled_at = EXCLUDED.cancelled_at,
      updated_at = NOW()
  `, [
    data.student_id,
    data.lesson_request_id,
    data.lesson_id,
    data.instructor_id,
    data.status,
    data.requested_at,
    data.confirmed_at,
    data.started_at,
    data.completed_at,
    data.cancelled_at
  ]);
}


async function updateStudentState(connection, studentId, fields) {

  // 🟢 STEP A — GET CURRENT STATUS
  const { rows } = await connection.query(`
    SELECT status
    FROM student_active_lesson_projection
    WHERE student_id = $1
  `, [studentId]);

  const currentStatus = rows[0]?.status;

  // 🟢 STEP B — BLOCK FINAL STATE OVERRIDE
  const finalStates = ['completed', 'cancelled'];

  if (finalStates.includes(currentStatus)) {
  console.log("⛔ IGNORE UPDATE — FINAL STATE:", currentStatus);

  // 🔥 STILL EMIT (IMPORTANT)
  return { skipped: true };
}

  // 🟢 STEP C — NORMAL UPDATE
  const keys = Object.keys(fields);
  const values = Object.values(fields);

  if (keys.length === 0) return;

  const setClause = keys
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');

  await connection.query(`
    UPDATE student_active_lesson_projection
    SET ${setClause}, updated_at = NOW()
    WHERE student_id = $1
  `, [studentId, ...values]);
}


export {
  upsertStudentState,
  updateStudentState
};
