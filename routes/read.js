const express = require('express');
const router = express.Router();
import pool from '../db.js';

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

import express from "express";
import {
  createStudent,
  activateStudent,
  deactivateStudent
} from "../services/studentService.js";

const router = express.Router();

router.post("/student/create", createStudent);
router.post("/student/activate", activateStudent);
router.post("/student/deactivate", deactivateStudent);

export default router;

