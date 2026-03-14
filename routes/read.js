import { rebuildProjections } from "../services/projectionRebuildService.js";
import { getInstructorDailySchedule } from "../services/instructorService.js";
import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/instructor/:id/schedule", getInstructorDailySchedule);

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


router.get("/instructor/offers", async (req, res) => {

  const { instructor_id } = req.query;

  const client = await pool.connect();

  try {

    const { rows } = await client.query(`
      SELECT
        offer_id,
        lesson_request_id,
        instructor_id,
        expires_at,
        created_at
      FROM instructor_pending_offers
      WHERE instructor_id = $1
      ORDER BY created_at ASC
    `, [instructor_id]);

    res.json(rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "failed_to_fetch_offers"
    });

  } finally {

    client.release();

  }

});

router.get("/lesson-status", async (req,res) => {

  const { lesson_id } = req.query;

  const { rows } = await pool.query(`
    SELECT *
    FROM lesson_status_projection
    WHERE lesson_id = $1
  `,[lesson_id]);

  res.json(rows[0] || null);

});

router.get("/student-active-lesson", async (req,res)=>{

  const { student_id } = req.query;

  const { rows } = await pool.query(`
    SELECT *
    FROM student_active_lesson_projection
    WHERE student_id = $1
  `,[student_id]);

  res.json(rows[0] || null);

});

router.get("/instructor-active-lesson", async (req, res) => {

  const { instructor_id } = req.query;

  if (!instructor_id) {
    return res.status(400).json({ error: "instructor_id required" });
  }

  try {

    const { rows } = await pool.query(`
      SELECT *
      FROM instructor_active_lesson_projection
      WHERE instructor_id = $1
    `, [instructor_id]);

    res.json(rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "query_failed" });

  }

});

router.get("/student-upcoming-lessons", async (req, res) => {

  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ error: "student_id required" });
  }

  try {

    const { rows } = await pool.query(`
      SELECT *
      FROM student_upcoming_lessons_projection
      WHERE student_id = $1
      ORDER BY start_time
      LIMIT 5
    `, [student_id]);

    res.json(rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "query_failed" });

  }

});

router.get("/student-dashboard", async (req, res) => {

  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ error: "student_id required" });
  }

  try {

    const activeLesson = await pool.query(`
      SELECT *
      FROM student_active_lesson_projection
      WHERE student_id = $1
    `, [student_id]);

    const upcomingLessons = await pool.query(`
      SELECT *
      FROM student_upcoming_lessons_projection
      WHERE student_id = $1
      ORDER BY start_time
      LIMIT 5
    `, [student_id]);

    const instructorZones = await pool.query(`
      SELECT
  icz.instructor_id,
  icz.zone_id,
  z.zone_name
FROM instructor_current_zone icz
JOIN geo_zones z
ON icz.zone_id = z.id
    `);

    res.json({
      active_lesson: activeLesson.rows[0] || null,
      upcoming_lessons: upcomingLessons.rows,
      instructor_locations: instructorZones.rows
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "dashboard_query_failed" });

  }

});


router.get("/lesson-timeline", async (req, res) => {

  const { lesson_request_id } = req.query;

  if (!lesson_request_id) {
    return res.status(400).json({ error: "lesson_request_id required" });
  }

  try {

    const result = await pool.query(`
      SELECT *
      FROM lesson_timeline_projection
      WHERE lesson_request_id = $1
    `, [lesson_request_id]);

    res.json(result.rows[0] || null);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "timeline_query_failed" });

  }

});

router.get("/instructor-earnings", async (req, res) => {

  const { instructor_id } = req.query;

  if (!instructor_id) {
    return res.status(400).json({ error: "instructor_id required" });
  }

  try {

    const result = await pool.query(`
      SELECT *
      FROM instructor_earnings_projection
      WHERE instructor_id = $1
    `, [instructor_id]);

    res.json(result.rows[0] || null);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "earnings_query_failed" });

  }

});

router.get("/marketplace-live-state", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT *
      FROM marketplace_live_state_projection
    `);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "marketplace_state_query_failed" });

  }

});

console.log("Instructor dashboard route loaded");

router.get("/instructor-dashboard", async (req, res) => {

  const { instructor_id } = req.query;

  if (!instructor_id) {
    return res.status(400).json({ error: "instructor_id required" });
  }

  try {

    const result = await pool.query(`
      SELECT *
      FROM instructor_dashboard_projection
      WHERE instructor_id = $1
    `, [instructor_id]);

    res.json(result.rows[0] || null);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "dashboard_query_failed" });

  }

});

router.post("/admin/rebuild-projections", async (req,res)=>{

  try {

    await rebuildProjections();

    res.json({
      status: "rebuild_complete"
    });

  } catch(err) {

    console.error(err);

    res.status(500).json({
      error: "rebuild_failed"
    });

  }
});

router.get("/event-stream", async (req, res) => {

  const { identity_id } = req.query;

  if (!identity_id) {
    return res.status(400).json({ error: "identity_id required" });
  }

  try {

    const result = await pool.query(`
      SELECT *
      FROM event_stream_view
      WHERE identity_id = $1
      ORDER BY created_at ASC
    `, [identity_id]);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "event_stream_query_failed" });

  }

});

router.get("/event-audit", async (req,res)=>{

  try {

    const result = await pool.query(`
      SELECT *
      FROM event_audit_violations
      ORDER BY identity_id
      LIMIT 100
    `);

    res.json(result.rows);

  } catch(err){

    console.error(err);
    res.status(500).json({error:"audit_query_failed"});

  }

});

router.get("/dispatch-observability", async (req, res) => {

  const { lesson_request_id } = req.query;

  try {

    const result = await pool.query(`
      SELECT *
      FROM dispatch_observability_projection
      WHERE lesson_request_id = $1
      ORDER BY offer_created_at ASC
    `, [lesson_request_id]);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "dispatch_observability_failed" });

  }

});

import { simulateDispatchRequests } from "../services/dispatchSimulationService.js";

router.post("/admin/simulate-dispatch", async (req, res) => {

  const { request_count, zone_id } = req.body;

  if (!request_count || !zone_id) {
    return res.status(400).json({
      error: "request_count and zone_id required"
    });
  }

  try {

    const result = await simulateDispatchRequests(
      request_count,
      zone_id
    );

    res.json({
      created_requests: result
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "dispatch_simulation_failed"
    });

  }

});

router.get("/admin/system-health", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        active_lesson_requests,
        active_lessons,
        upcoming_lessons,
        online_instructors,
        pending_offers,
        snapshot_time
      FROM marketplace_live_state_projection
    `);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "system_health_query_failed" });

  }

});

router.get("/admin/dispatch-metrics", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE event_type='lesson_offer_sent') AS offers_sent,
        COUNT(*) FILTER (WHERE event_type='lesson_offer_accepted') AS offers_accepted,
        COUNT(DISTINCT instructor_id) FILTER (WHERE event_type='lesson_offer_sent') AS instructors_participating
      FROM event
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "dispatch_metrics_query_failed" });

  }

});

router.get("/admin/liquidity-pressure", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT *
      FROM zone_liquidity_pressure
      ORDER BY zone_id
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "liquidity_query_failed" });

  }

});

router.get("/admin/recent-activity", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT *
      FROM recent_activity_projection
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "recent_activity_query_failed" });

  }

});

export default router;
