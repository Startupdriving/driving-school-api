const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * POST /write/students
 * Create student identity + student_created event
 */
router.post('/students', async (req, res) => {
  try {
    // 1. Create identity
    const identityResult = await pool.query(
      "INSERT INTO identity (identity_type) VALUES ('student') RETURNING identity_id"
    );

    const identityId = identityResult.rows[0].identity_id;

    // 2. Create event
    await pool.query(
      'INSERT INTO event (identity_id, event_type) VALUES ($1, $2)',
      [identityId, 'student_created']
    );

    res.status(201).json({
      message: 'Student created',
      identity_id: identityId
    });
  } catch (err) {
    console.error('WRITE ERROR:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
