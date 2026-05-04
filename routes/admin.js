import express from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "username_and_password_required"
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM admins
      WHERE username = $1
      AND is_active = true
      LIMIT 1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const admin = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      admin.password_hash
    );
   console.log("LOGIN USER:", admin.username);
   console.log("HASH CHECK:", valid);

    if (!valid) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const token = jwt.sign(
      {
        admin_id: admin.id,
        username: admin.username,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      status: "ok",
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    res.status(500).json({
      error: "server_error"
    });
  }
});


router.get("/users/summary", async (req, res) => {
  try {
    const admins = await pool.query(
      `SELECT COUNT(*)::int AS count FROM admins`
    );

    const students = await pool.query(
     `SELECT COUNT(*)::int AS count
     FROM students`
    );

    const instructors = await pool.query(
      `SELECT COUNT(DISTINCT instructor_id)::int AS count
       FROM instructor_location_projection`
    );

    res.json({
      admins: admins.rows[0].count,
      students: students.rows[0].count,
      instructors: instructors.rows[0].count
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "summary_failed" });
  }
});


router.get("/admins", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, role, is_active, created_at
      FROM admins
      ORDER BY created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: "admins_failed" });
  }
});


router.get("/students", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        mobile_number,
        age,
        city,
        preferred_language,
        status,
        is_verified,
        created_at
      FROM students
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "students_failed"
    });
  }
});


router.get("/instructors", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        mobile_number,
        gender,
        zone,
        status,
        is_verified,
        created_at
      FROM instructors
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: "instructors_failed"
    });
  }
});


router.post("/students/create", async (req, res) => {
  try {
    const {
      full_name,
      mobile_number,
      age,
      city,
      preferred_language
    } = req.body;

    if (!full_name || !mobile_number) {
      return res.status(400).json({
        error: "name_and_mobile_required"
      });
    }

    const exists = await pool.query(
      `SELECT 1 FROM students
       WHERE mobile_number = $1
       LIMIT 1`,
      [mobile_number]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        error: "mobile_exists"
      });
    }

    const result = await pool.query(`
      INSERT INTO students (
        full_name,
        mobile_number,
        age,
        city,
        preferred_language
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [
      full_name,
      mobile_number,
      age || null,
      city || null,
      preferred_language || null
    ]);

    res.json({
      status: "created",
      student: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "student_create_failed"
    });
  }
});


router.post("/instructors/create", async (req, res) => {
  try {
    const {
      full_name,
      mobile_number,
      gender,
      date_of_birth,
      cnic,
      license_number,
      car_model,
      transmission_type,
      zone,
      notes
    } = req.body;

    if (!full_name || !mobile_number) {
      return res.status(400).json({
        error: "name_and_mobile_required"
      });
    }

    const exists = await pool.query(
      `SELECT 1
       FROM instructors
       WHERE mobile_number = $1
       LIMIT 1`,
      [mobile_number]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        error: "mobile_exists"
      });
    }

    const result = await pool.query(`
      INSERT INTO instructors (
        full_name,
        mobile_number,
        gender,
        date_of_birth,
        cnic,
        license_number,
        car_model,
        transmission_type,
        zone,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      full_name,
      mobile_number,
      gender || null,
      date_of_birth || null,
      cnic || null,
      license_number || null,
      car_model || null,
      transmission_type || null,
      zone || null,
      notes || null
    ]);

    res.json({
      status: "created",
      instructor: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "instructor_create_failed"
    });
  }
});

router.patch("/instructors/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = [
      "pending",
      "active",
      "inactive",
      "suspended",
      "rejected"
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: "invalid_status"
      });
    }

    const result = await pool.query(`
      UPDATE instructors
      SET
        status = $1,
        is_verified = CASE
          WHEN $1 = 'active' THEN true
          ELSE is_verified
        END
      WHERE id = $2
      RETURNING id, full_name, status, is_verified
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "not_found"
      });
    }

    res.json({
      status: "updated",
      instructor: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "status_update_failed"
    });
  }
});


router.get("/instructors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        full_name,
        mobile_number,
        gender,
        date_of_birth,
        cnic,
        license_number,
        car_model,
        transmission_type,
        zone,
        status,
        is_verified,
        documents_verified,
        notes,
        created_at
      FROM instructors
      WHERE id = $1
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "not_found"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "instructor_detail_failed"
    });
  }
});


router.patch("/instructors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      full_name,
      mobile_number,
      zone,
      car_model,
      transmission_type,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE instructors
      SET
        full_name = $1,
        mobile_number = $2,
        zone = $3,
        car_model = $4,
        transmission_type = $5,
        notes = $6
      WHERE id = $7
      RETURNING *
    `, [
      full_name,
      mobile_number,
      zone,
      car_model,
      transmission_type,
      notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "not_found"
      });
    }

    res.json({
      status: "updated",
      instructor: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "update_failed"
    });
  }
});


router.get("/approvals/instructors", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        mobile_number,
        zone,
        created_at,
        is_verified
      FROM instructors
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "approvals_failed"
    });
  }
});


router.post("/student/login", async (req, res) => {
  try {
    const { mobile_number, password } = req.body;

    const result = await pool.query(`
      SELECT id, full_name, mobile_number, password_hash, status
      FROM students
      WHERE mobile_number = $1
      LIMIT 1
    `, [mobile_number]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const student = result.rows[0];

    const ok = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!ok) {
      return res.status(401).json({
        error: "invalid_credentials"
      });
    }

    const token = jwt.sign(
      {
        student_id: student.id,
        role: "student"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
    console.error("STUDENT LOGIN ERROR:", err);
    res.status(500).json({
      error: "login_failed"
    });
  }
});

export default router;
