import db from "../db.js";

// 🔁 SAFE QUERY WRAPPER
const getConnection = (connection) => {
  if (connection && typeof connection.query === "function") {
    return connection;
  }
  return db; // fallback to pool
};

// 🟢 FIND BY REQUEST
async function findStudentByRequest(connection, requestId) {
  const conn = getConnection(connection);

  const res = await conn.query(`
    SELECT payload->>'student_id' AS student_id
    FROM event
    WHERE identity_id = $1
    AND event_type = 'lesson_requested'
    LIMIT 1
  `, [requestId]);

  return res.rows[0]?.student_id || null;
}

// 🟢 FIND BY LESSON
async function findStudentByLesson(connection, lessonId) {
  const conn = getConnection(connection);

  const res = await conn.query(`
    SELECT student_id
    FROM lesson_schedule_projection
    WHERE lesson_request_id = $1
    LIMIT 1
  `, [lessonId]);

  return res.rows[0]?.student_id || null;
}

export {
  findStudentByRequest,
  findStudentByLesson
};
