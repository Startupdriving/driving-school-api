import pool from "../db.js";
import { rebuildProjections } from "../services/projectionRebuildService.js";
import { v4 as uuidv4 } from "uuid";
import { setInstructorAvailability } from "../services/instructorService.js";
import express from "express";
import { emitToInstructor } from "../services/wsService.js";
import {  findStudentByRequest } from "../services/studentProjectionHelpers.js";
import { updateStudentState } from "../services/studentProjectionWriter.js";
import { emitToStudent } from '../services/wsService.js';
import {
  createStudent,
  activateStudent,
  deactivateStudent
} from "../services/studentService.js";

const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);
router.post("/instructor/availability", setInstructorAvailability);

router.post("/admin/rebuild-projections", async (req, res) => {
  console.log("🔥 REBUILD ROUTE HIT")
  try {
    await rebuildProjections();
    res.json({ success: true });
  } catch (err) {
    console.error("Rebuild failed:", err);
    res.status(500).json({ error: "Rebuild failed" });
  }
});


router.post("/instructor/accept-offer", async (req, res) => {

  const { instructor_id, lesson_request_id } = req.body; // ✅ FIXED

 // const client = await pool.connect();
    const client = pool;

  console.log("CLIENT OBJECT:", client);
console.log("TYPE OF CLIENT:", typeof client);
console.log("HAS QUERY:", client && typeof client.query);

  try {
    //await client.query("BEGIN");

    // 1️⃣ Check if offer exists
    const offerCheck = await client.query(`
      SELECT *
      FROM instructor_offers_projection
      WHERE instructor_id = $1
      AND lesson_request_id = $2
    `, [instructor_id, lesson_request_id]);

    if (offerCheck.rows.length === 0) {
      throw new Error("offer_not_found");
    }

    // 2️⃣ LOCK CHECK
    const alreadyConfirmed = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_confirmed'
      LIMIT 1
    `, [lesson_request_id]);

    if (alreadyConfirmed.rows.length > 0) {
      return res.status(400).json({
        error: "Lesson already confirmed by another instructor"
      });
    }

    // 3️⃣ ACCEPT EVENT
    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id,
        payload
      )
      VALUES ($1,$2,'lesson_offer_accepted',$3,$4)
    `, [
      uuidv4(),
      lesson_request_id,
      instructor_id,
      JSON.stringify({
        instructor_id,
        lesson_request_id
      })
    ]);

    // 4️⃣ CONFIRM EVENT
    const { rows } = await client.query(`
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES ($1,$2,'lesson_confirmed',$3,$4)
  RETURNING created_at
`, [
  uuidv4(),
  lesson_request_id,
  instructor_id,
  JSON.stringify({
    instructor_id,
    lesson_request_id
  })
]);


// 🔥 REMOVE ALL OTHER OFFERS (CRITICAL)
await client.query(`
  DELETE FROM instructor_offers_projection
  WHERE lesson_request_id = $1
`, [lesson_request_id]);

const eventTime = rows[0].created_at;

// ✅ STUDENT PROJECTION UPDATE (confirmed)
const studentId = await findStudentByRequest(client, lesson_request_id);


console.log("🔥 CONFIRMED HOOK HIT:", studentId);

if (studentId) {
  await updateStudentState(client, studentId, {
    status: 'confirmed',
    instructor_id: instructor_id,
    confirmed_at: eventTime,

// 🔥 CLEAN INVALID FUTURE STATES
  started_at: null,
  completed_at: null,
  cancelled_at: null
  });
}

if (studentId) {
  emitToStudent(studentId, {
    type: "student_update"
  });
}


  // 🥇 5️⃣ CREATE LESSON ENTITY (CLEAN)

    const newLessonId = uuidv4(); // ✅ renamed

    await client.query(`
      INSERT INTO identity (id, identity_type)
      VALUES ($1, 'lesson')
    `, [newLessonId]);



    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id,
        payload
      )
      VALUES ($1,$2,'lesson_created',$3,$4)
    `, [
      uuidv4(),
      newLessonId,
      instructor_id,
      JSON.stringify({
        lesson_id: newLessonId,
        lesson_request_id
      })
    ]);


   // ✅ STUDENT PROJECTION UPDATE (attach lesson_id)
console.log("🔥 LESSON_CREATED HOOK HIT:", studentId);

if (studentId) {
  await updateStudentState(client, studentId, {
    lesson_id: newLessonId
  });

   //await client.query("COMMIT");

  // 🔥 CRITICAL — EMIT TO STUDENT
  emitToStudent(studentId, {
    type: "student_update"
  });
}

// ✅ KEEP instructor update
emitToInstructor(instructor_id, {
  type: "dashboard_update"
});


    console.log("✅ LESSON CONFIRMED:", lesson_request_id);


    res.json({
      status: "offer_accepted",
      lesson_id: newLessonId // ✅ return correct id
    });

  } catch (err) {
   // await client.query("ROLLBACK");
    console.error("❌ ACCEPT ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
   // client.release();
  }
});

export default router;
