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
    SELECT e1.payload->>'student_id' AS student_id
    FROM event e1
    JOIN event e2
      ON e1.identity_id = (e2.payload->>'lesson_request_id')::uuid
    WHERE e2.identity_id = $1
    AND e1.event_type = 'lesson_requested'
    AND e2.event_type = 'lesson_created'
    LIMIT 1
  `, [lessonId]);

  return res.rows[0]?.student_id || null;
}

export {
  findStudentByRequest,
  findStudentByLesson
};
