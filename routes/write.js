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
import { updateStudent } from "../services/studentService.js";
import { replayDeadEvent } from "../services/replayService.js";
import { handleEvent }
  from "../services/eventHandler.js";
import {
  handleReliabilityProjection
} from "../services/reliabilityProjectionHandler.js";



const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);
router.post("/instructor/availability", setInstructorAvailability);
router.post("/student/update", updateStudent);
router.post("/dead-event/replay", replayDeadEvent);


router.post(
  "/test-reliability-idempotency",
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const eventRes =
        await client.query(`
          SELECT *
          FROM event
          WHERE id = $1
          LIMIT 1
        `, [
          '3da6f914-9a96-47e5-b69d-d075b3ea2eb2'
        ]);

      const event =
        eventRes.rows[0];

      await client.query("BEGIN");

      await handleReliabilityProjection(
        client,
        event,
        { replay: true }
      );

      await handleReliabilityProjection(
        client,
        event,
        { replay: true }
      );

      await client.query("COMMIT");

      res.json({
        success: true
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      client.release();

    }

});



router.post(
  "/test-projection-idempotency",
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const eventRes =
        await client.query(`
          SELECT *
          FROM event
          WHERE id = $1
          LIMIT 1
        `, [
          '3da6f914-9a96-47e5-b69d-d075b3ea2eb2'
        ]);

      const event =
        eventRes.rows[0];

      await client.query("BEGIN");

      await handleEvent(
        client,
        event,
         { replay: true }
      );

      await handleEvent(
        client,
        event,
          { replay: true }

      );

      await client.query("COMMIT");

      res.json({
        success: true
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    } finally {

      client.release();

    }

});


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

    res.json({
      success: true
    });

  } catch (err) {

    console.error(
      "Rebuild failed:",
      err
    );

    res.status(500).json({
      error: "Rebuild failed"
    });

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
