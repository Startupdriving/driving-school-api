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
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);
router.post("/instructor/availability", setInstructorAvailability);


router.post("/student/signup", async (req, res) => {
  try {
    const {
      full_name,
      mobile_number,
      age,
      city,
      preferred_language,
      password
    } = req.body;

    if (!full_name || !mobile_number || !password) {
      return res.status(400).json({
        error: "name_mobile_password_required"
      });
    }

    const exists = await pool.query(
      `
      SELECT 1
      FROM students
      WHERE mobile_number = $1
      LIMIT 1
      `,
      [mobile_number]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        error: "mobile_exists"
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
  `
  INSERT INTO students (
    full_name,
    mobile_number,
    age,
    city,
    preferred_language,
    password_hash,
    status,
    is_verified
  )
  VALUES ($1,$2,$3,$4,$5,$6,'active',true)
  RETURNING
    id,
    full_name,
    mobile_number
  `,
  [
    full_name,
    mobile_number,
    age || null,
    city || null,
    preferred_language || null,
    password_hash
  ]
);

    res.json({
      status: "signup_success",
      student: result.rows[0]
    });

  } catch (err) {
    console.error("STUDENT SIGNUP ERROR:", err);

    res.status(500).json({
      error: "signup_failed"
    });
  }
});



router.post("/student/login", async (req, res) => {
  try {
    const {
      mobile_number,
      password
    } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({
        error: "mobile_and_password_required"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        mobile_number,
        password_hash,
        status
      FROM students
      WHERE mobile_number = $1
      LIMIT 1
      `,
      [mobile_number]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const student = result.rows[0];

    const passwordOk = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!passwordOk) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    if (
      student.status &&
      student.status !== "active"
    ) {
      return res.status(403).json({
        error: "account_inactive"
      });
    }

    const token = jwt.sign(
      {
        student_id: student.id,
        role: "student"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      status: "ok",
      token,
      student: {
        id: student.id,
        full_name: student.full_name,
        mobile_number: student.mobile_number
      }
    });

  } catch (err) {
    console.error(
      "STUDENT LOGIN ERROR:",
      err
    );

    res.status(500).json({
      error: "login_failed"
    });
  }
});



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
  const { instructor_id, lesson_request_id } = req.body;

  if (!instructor_id || !lesson_request_id) {
    return res.status(400).json({
      error: "missing_fields"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Offer must exist
    const offerCheck = await client.query(`
      SELECT 1
      FROM instructor_offers_projection
      WHERE instructor_id = $1
        AND lesson_request_id = $2
      LIMIT 1
    `, [instructor_id, lesson_request_id]);

    if (offerCheck.rowCount === 0) {
      throw new Error("offer_not_found");
    }

    // 2. Prevent double confirm
    const alreadyConfirmed = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
        AND event_type = 'lesson_confirmed'
      LIMIT 1
    `, [lesson_request_id]);

    if (alreadyConfirmed.rowCount > 0) {
      throw new Error("lesson_already_confirmed");
    }

    // 3. Accept event
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

    // 4. Confirm event
    const confirmRes = await client.query(`
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

    const confirmedAt = confirmRes.rows[0].created_at;

    // 5. Create lesson identity
    const lesson_id = uuidv4();

    await client.query(`
      INSERT INTO identity (id, identity_type)
      VALUES ($1, 'lesson')
    `, [lesson_id]);

    // 6. lesson_created event (CRITICAL)
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
      lesson_id,
      instructor_id,
      JSON.stringify({
        lesson_id,
        lesson_request_id,
        instructor_id
      })
    ]);

    // 7. Confirm projection
    await client.query(`
      UPDATE lesson_schedule_projection
      SET status = 'confirmed',
          updated_at = NOW()
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    // 8. Remove competing offers
    await client.query(`
      DELETE FROM instructor_offers_projection
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    // 9. Student state update
    const studentId = await findStudentByRequest(
      client,
      lesson_request_id
    );

    if (studentId) {
      await updateStudentState(client, studentId, {
        status: "confirmed",
        instructor_id,
        lesson_id,
        confirmed_at: confirmedAt,
        started_at: null,
        completed_at: null,
        cancelled_at: null
      });
    }

    await client.query("COMMIT");

    // Emit AFTER commit
    if (studentId) {
      emitToStudent(studentId, {
        type: "student_update"
      });
    }

    emitToInstructor(instructor_id, {
      type: "dashboard_update"
    });

    res.json({
      status: "offer_accepted",
      lesson_id
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ ACCEPT ERROR:", err);

    res.status(500).json({
      error: err.message
    });

  } finally {
    client.release();
  }
});

router.post("/instructor/login", async (req, res) => {
  try {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({
        error: "mobile_and_password_required"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        mobile_number,
        password_hash,
        status,
        is_verified
      FROM instructors
      WHERE mobile_number = $1
      LIMIT 1
      `,
      [mobile_number]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const instructor = result.rows[0];
    if (!instructor.password_hash) {
  return res.status(401).json({
    error: "password_not_set"
  });
}

const ok = await bcrypt.compare(
  password,
  instructor.password_hash
);

if (!ok) {
  return res.status(401).json({
    error: "invalid_credentials"
  });
}

    if (
      instructor.status !== "active" ||
      !instructor.is_verified
    ) {
      return res.status(403).json({
        error: "account_not_approved"
      });
    }

    const token = jwt.sign(
      {
        instructor_id: instructor.id,
        role: "instructor"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await pool.query(
      `
      UPDATE instructors
      SET last_login_at = NOW()
      WHERE id = $1
      `,
      [instructor.id]
    );

    res.json({
      status: "ok",
      token,
      instructor: {
        id: instructor.id,
        full_name: instructor.full_name,
        mobile_number: instructor.mobile_number
      }
    });

  } catch (err) {
    console.error("INSTRUCTOR LOGIN ERROR:", err);

    res.status(500).json({
      error: "login_failed"
    });
  }
});

export default router;
