import pool from "../db.js";

export async function getInstructorSchedule(instructor_id) {

  const { rows } = await pool.query(`
    SELECT
      lesson_request_id,
      student_id,
      car_id,
      start_time,
      end_time,
      status
    FROM lesson_schedule_projection
    WHERE instructor_id = $1
    ORDER BY start_time ASC
  `, [instructor_id]);

  const now = new Date();

  let activeLesson = null;
  let futureLessons = [];

  for (const lesson of rows) {

    if (lesson.status === 'started') {
      activeLesson = lesson;
    }

    if (
      lesson.status === 'confirmed' &&
      new Date(lesson.start_time) > now
    ) {
      futureLessons.push(lesson);
    }
  }

  // sort future lessons by time
  futureLessons.sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time)
  );

  const nextLesson = futureLessons[0] || null;

  return {
    active_lesson: activeLesson,
    next_lesson: nextLesson,
    future_lessons: futureLessons
  };
}
