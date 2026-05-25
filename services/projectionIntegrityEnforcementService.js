export async function enforceSingleActiveLessonInvariant(

  client,
  studentId

) {

  const result =
    await client.query(`

      SELECT COUNT(*) AS active_count

      FROM student_active_lesson_projection

      WHERE student_id = $1

      AND status IN (

        'confirmed',
        'started'

      )

    `, [studentId]);

  const activeCount =
    Number(
      result.rows[0]
        .active_count
    );

  if (activeCount > 0) {

    throw new Error(

      "integrity_violation:student_already_has_active_lesson"

    );

  }

}
