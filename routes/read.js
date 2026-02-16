import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * GET active students
 */
router.get("/students/active", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM current_active_students"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

// GET active instructors
router.get('/instructors/active', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM current_active_instructors'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET available cars
router.get('/cars/active', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM current_active_cars"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET scheduled lessons
router.get('/lessons/scheduled', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM current_scheduled_lessons'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Instructor stats
router.get('/stats/instructors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM instructor_lesson_stats'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student stats
router.get('/stats/students', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM student_lesson_stats'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
