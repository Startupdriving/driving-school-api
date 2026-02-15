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
router.get('/cars/available', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM available_cars'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
