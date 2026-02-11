const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET active students
 * Source: current_active_students VIEW
 */
router.get('/students/active', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM current_active_students'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET active instructors
 * Source: current_active_instructors VIEW
 */
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

/**
 * GET available cars
 * Source: available_cars VIEW
 */
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

module.exports = router;
