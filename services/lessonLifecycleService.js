import pool from "../db.js";

import { v4 as uuidv4 } from "uuid";

import {
  emitToInstructor,
  emitToStudent
} from "./wsService.js";

import {
  findStudentByLesson
} from "./studentProjectionHelpers.js";

import {
  updateStudentState
} from "./studentProjectionWriter.js";

import {
  assertTransition
} from "./lifecycleGuards.js";

import { insertEvent }
from "./eventStore.js";


import {
  getCurrentStreamVersion
} from "./streamVersionService.js";

/* =====================================================
   START LESSON
===================================================== */



export async function startLesson({
  lesson_id,
  instructor_id
}) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Must exist as lesson entity
    const lessonCheck = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_created'
      LIMIT 1
    `, [lesson_id]);

    if (lessonCheck.rowCount === 0) {
      throw new Error("lesson_created_missing");
    }

    // Must be confirmed for this instructor
    // Prevent duplicate start

    // Global instructor active lock
    const activeLesson = await client.query(`
      SELECT 1
      FROM lesson_schedule_projection
      WHERE instructor_id = $1
        AND status = 'started'
      LIMIT 1
    `, [instructor_id]);

    if (activeLesson.rowCount > 0) {
      throw new Error("instructor_already_has_active_lesson");
    }

  const lessonQuery = await client.query(`
  SELECT
    status,
    instructor_id
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

if (lessonQuery.rowCount === 0) {
  throw new Error("lesson_not_found");
}

const lesson = lessonQuery.rows[0];


assertTransition(
  lesson.status,
  "started"
);

if (lesson.instructor_id !== instructor_id) {
  throw new Error("lesson_not_owned");
}


const currentVersion =
  await getCurrentStreamVersion(
    client,
    lesson_id
  );


    // Insert event
    await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_started",

  expected_version:
    currentVersion,

  instructor_id,

  payload: {
    lesson_id
  }

});

    const lessonRes =
   await client.query(`
     SELECT student_id
     FROM lesson_schedule_projection
     WHERE lesson_id = $1
     LIMIT 1
    `, [lesson_id]);

   const studentId =
  lessonRes.rows[0]?.student_id;


    await client.query("COMMIT");

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });

    if (studentId) {
      emitToStudent(studentId, {
        type: "student_update"
      });
    }

    return {
      status: "lesson_started"
    };

  } catch (err) {

    await client.query("ROLLBACK");

    throw err;

  } finally {

    client.release();

  }

}

/* =====================================================
   COMPLETE LESSON
===================================================== */

export async function completeLesson({
  lesson_id,
  instructor_id
}) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Must have started
    // Ownership validation

const lessonQuery = await client.query(`
  SELECT
    status,
    instructor_id
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

if (lessonQuery.rowCount === 0) {
  throw new Error("lesson_not_found");
}

const lesson =
  lessonQuery.rows[0];

assertTransition(
  lesson.status,
  "completed"
);


if (lesson.instructor_id !== instructor_id) {
  throw new Error("lesson_not_owned");
}


const currentVersion =
  await getCurrentStreamVersion(
    client,
    lesson_id
  );

await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_completed",

  expected_version:
    currentVersion ,

  instructor_id,

  payload: {
    lesson_id
  }

});


    await client.query("COMMIT");

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });


     const lessonRes = await client.query(`
  SELECT student_id
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

const studentId =
  lessonRes.rows[0]?.student_id;


    if (studentId) {

      emitToStudent(studentId, {
        type: "student_update"
      });

    }

    return {
      status: "lesson_completed"
    };

  } catch (err) {

    await client.query("ROLLBACK");

    throw err;

  } finally {

    client.release();

  }

}


/* =====================================================
   CANCEL LESSON
===================================================== */


export async function cancelLesson({
  lesson_id,
  actor,
  actor_id,
  reason = null
}) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Prevent duplicate cancel

    // Ownership validation
   const lessonQuery = await client.query(`
  SELECT
    status,
    instructor_id,
    student_id
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

if (lessonQuery.rowCount === 0) {
  throw new Error("lesson_not_found");
}

const lesson = lessonQuery.rows[0];

assertTransition(
  lesson.status,
  "cancelled"
);

const ownsLesson =
  lesson.instructor_id === actor_id ||
  lesson.student_id === actor_id;

if (!ownsLesson) {
  throw new Error("lesson_not_owned");
}

  const currentVersion =
  await getCurrentStreamVersion(
    client,
    lesson_id
  );

await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    lesson_id,

  event_type:
    "lesson_cancelled",

  expected_version:
    currentVersion,

  payload: {
    lesson_id,
    cancelled_by: actor,
    cancelled_by_id: actor_id,
    reason
  }

});

   const lessonInfo = await client.query(`
     SELECT instructor_id
     FROM lesson_schedule_projection
     WHERE lesson_id = $1
     LIMIT 1
    `, [lesson_id]);

   const instructorId =
     lessonInfo.rows[0]?.instructor_id;



    await client.query("COMMIT");


   const lessonRes = await client.query(`
  SELECT student_id
  FROM lesson_schedule_projection
  WHERE lesson_id = $1
  LIMIT 1
`, [lesson_id]);

const studentId =
  lessonRes.rows[0]?.student_id;


    emitToInstructor(instructorId, {
      type: "dashboard_update"
    });

    if (studentId) {

      emitToStudent(studentId, {
        type: "student_update"
      });

    }

    return {
      status: "lesson_cancelled"
    };

  } catch (err) {

    await client.query("ROLLBACK");

    throw err;

  } finally {

    client.release();

  }

}
