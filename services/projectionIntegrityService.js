export async function verifyStudentActiveLessonIntegrity(

  client

) {

  const result =
    await client.query(`

      SELECT

        student_id,

        COUNT(*) AS active_count

      FROM student_active_lesson_projection

      WHERE status IN (

        'confirmed',
        'started'

      )

      GROUP BY student_id

      HAVING COUNT(*) > 1

    `);

  if (result.rows.length) {

    return {

      integrity_status:
        "corrupted",

      rule:
        "single_active_lesson_per_student",

      violations:
        result.rows

    };

  }

  return {

    integrity_status:
      "healthy",

    rule:
      "single_active_lesson_per_student",

    violations: []

  };

}
