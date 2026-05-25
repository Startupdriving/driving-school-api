import express from "express";
import pool from "../db.js";


import {
  startLesson,
  completeLesson,
  cancelLesson
} from "../services/lessonLifecycleService.js";


const router = express.Router();

/* =====================================================
   PASS-THROUGH ROUTES
===================================================== */
/* =====================================================
   HELPERS
===================================================== */

function requireFields(res, lesson_id, instructor_id) {
  if (!lesson_id || !instructor_id) {
    res.status(400).json({
      error: "lesson_id and instructor_id required"
    });
    return false;
  }

  return true;
}



async function beginTx() {
  const client = await pool.connect();
  await client.query("BEGIN");
  return client;
}

async function rollback(client, err, label, res) {
  await client.query("ROLLBACK");
  client.release();
  console.error(`${label} ERROR:`, err);

  res.status(400).json({
    error: err.message
  });
}

async function commit(client) {
  await client.query("COMMIT");
}

/* =====================================================
   START LESSON
===================================================== */

router.post("/start", async (req, res) => {

  const { lesson_id, instructor_id } = req.body;

  if (!requireFields(res, lesson_id, instructor_id)) {
    return;
  }

  try {

    const result = await startLesson({
      lesson_id,
      instructor_id
    });

    res.json(result);

  } catch (err) {

    console.error("START ERROR:", err);

    res.status(400).json({
      error: err.message
    });

  }

});

/* =====================================================
   COMPLETE LESSON
===================================================== */

router.post("/complete", async (req, res) => {

  const { lesson_id, instructor_id } = req.body;

  if (!requireFields(res, lesson_id, instructor_id)) {
    return;
  }

  try {

    const result = await completeLesson({
      lesson_id,
      instructor_id
    });

    return res.json(result);

  } catch (err) {

    console.error("COMPLETE ERROR:", err);

    return res.status(400).json({
      error: err.message
    });

  }

});

/* =====================================================
   CANCEL LESSON
===================================================== */
router.post("/cancel", async (req, res) => {

  const {
  lesson_id,
  actor,
  actor_id,
  reason = null
} = req.body;

  if (!requireFields(res, lesson_id, actor, actor_id)) {
    return;
  }

  try {

    const result = await cancelLesson({
  lesson_id,
  actor,
  actor_id,
  reason
});

    return res.json(result);

  } catch (err) {

    console.error("CANCEL ERROR:", err);

    return res.status(400).json({
      error: err.message
    });

  }

});


export default router;
