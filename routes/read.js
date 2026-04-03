import { simulateDispatchRequests } from "../services/dispatchSimulationService.js";
import { rebuildProjections } from "../services/projectionRebuildService.js";
import { getInstructorDailySchedule } from "../services/instructorService.js";
import express from "express";
import pool from "../db.js";
import crypto from "crypto"
import { validate as isUUID } from "uuid";

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

console.log("🔥 API instructor_id:", instructor_id);

    const { rows } = await pool.query(`
  SELECT
    instructor_id,
    lesson_request_id,
    status,
    created_at
    FROM instructor_offers_projection iop
    WHERE iop.instructor_id = $1

    AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = iop.lesson_request_id
    AND e.event_type = 'lesson_confirmed'
    )

   ORDER BY created_at DESC
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

router.post("/admin/rebuild-projections", async (req, res) => {

  try {

    console.log("PROJECTION REBUILD STARTED")

    await rebuildProjections()

    res.json({
      status: "rebuild_started"
    })

  } catch (err) {

    console.error("projection rebuild error:", err)

    res.status(500).json({
      error: "projection_rebuild_failed"
    })

  }

})

router.get("/event-stream", async (req, res) => {
  try {
    const id = req.query.identity_id;

    let result;

    if (id) {
      // ✅ SINGLE LESSON MODE (Inspector)
      result = await pool.query(`
        SELECT
          event_type,
          payload,
          created_at,
          identity_id
        FROM event
        WHERE identity_id = $1
        ORDER BY created_at ASC
      `, [id]);
    } else {
      // ✅ GLOBAL STREAM MODE (Dashboard)
      result = await pool.query(`
        SELECT
          event_type,
          payload,
          created_at,
          identity_id
        FROM event
        ORDER BY created_at DESC
        LIMIT 100
      `);
    }

    res.json(result.rows);

  } catch (err) {
    console.error("event stream error:", err);
    res.status(500).json({ error: "event_stream_failed" });
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

  try {

    const rawId = req.query.lesson_request_id;

const lessonId = req.query.lesson_request_id || null;

    const result = await pool.query(`
  SELECT DISTINCT ON (lesson_request_id, instructor_id, wave)
    lesson_request_id,
    instructor_id,
    wave,
    offer_created_at,
    instructor_zone,
    request_zone,
    economic_score,
    offers_last_24h,
    last_offer_at
  FROM dispatch_observability_projection
  WHERE ($1::uuid IS NULL OR lesson_request_id = $1::uuid)
  ORDER BY
    lesson_request_id,
    instructor_id,
    wave,
    offer_created_at DESC
`, [lessonId]);

    res.json(result.rows)

  } catch (err) {

    console.error("dispatch observability error:", err)
    res.status(500).json({ error: "dispatch_observability_failed" })

  }

})

router.post("/admin/simulate-dispatch", async (req, res) => {

  try {

    console.log("SIMULATION ROUTE HIT");

    const { request_count, zone_id } = req.body;

    console.log("📥 INPUT:", request_count, zone_id);

    const result = await simulateDispatchRequests(
      request_count,
      zone_id
    );

    console.log("✅ SIMULATION RESULT:", result);

    res.json({
      lesson_request_id: result[0],
      status: "simulation_started"
    });

  } catch (err) {

    console.error("❌ ROUTE ERROR:", err);

    res.status(500).json({
      error: "simulation_failed",
      details: err.message
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
      SELECT
        event_type,
        identity_id,
        created_at
      FROM event
      ORDER BY created_at DESC
      LIMIT 20
    `)

    res.json(result.rows)

  } catch (err) {
    console.error("recent activity error:", err)
    res.status(500).json({ error: "recent_activity_failed" })
  }
})

router.get("/instructor-locations", async (req, res) => {
  try {

    const { rows } = await pool.query(`
      SELECT
        instructor_id,
        zone_id,
        lat,
        lng
      FROM instructor_current_zone
    `);

    res.json(rows);

  } catch (err) {
    console.error("instructor-locations error:", err);
    res.status(500).json({ error: "failed" });
  }
});

router.get("/admin/active-lessons-map", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        lesson_id,
        student_lat,
        student_lng,
        instructor_lat,
        instructor_lng
      FROM active_lessons_map_projection
    `)

    res.json(result.rows)

  } catch (err) {

    console.error("active lessons map error:", err)

    res.status(500).json({
      error: "active_lessons_map_failed"
    })

  }

})

router.get("/admin/liquidity-risk", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT zone_id, recent_requests_5m, online_instructors
      FROM zone_liquidity_pressure
    `);

    const risk = rows.map(z => ({
      zone_id: z.zone_id,
      risk_score: Number(z.recent_requests_5m) / (Number(z.online_instructors) + 1)
    }));

    res.json(risk);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "liquidity_risk_failed" });
  }
});

router.get("/admin/instructor-drift", async (req, res) => {

  try {

    const instructors = await pool.query(`
      SELECT instructor_id, lat, lng
      FROM instructor_location_projection
    `)

    const zones = await pool.query(`
      SELECT zone_id, recent_requests_5m
      FROM zone_liquidity_pressure
    `)

    const zoneCoordinates = {
      1: [31.5204, 74.3587],
      2: [31.5000, 74.3500],
      3: [31.5400, 74.3700],
      4: [31.5300, 74.3300],
      5: [31.5100, 74.3800],
      6: [31.4900, 74.3600],
      7: [31.5600, 74.3400],
      8: [31.5200, 74.3900]
    }

    const drift = instructors.rows.map(inst => {

      let bestZone = null
      let bestScore = -Infinity

      zones.rows.forEach(zone => {

        const coords = zoneCoordinates[zone.zone_id]
        if (!coords) return

        const dx = coords[0] - inst.lat
        const dy = coords[1] - inst.lng

        const distance = Math.sqrt(dx * dx + dy * dy) + 0.001
        const demand = Number(zone.recent_requests_5m)

        const score = demand / distance

        if (score > bestScore) {
          bestScore = score
          bestZone = zone.zone_id
        }

      })

      return {
        instructor_id: inst.instructor_id,
        from_lat: Number(inst.lat),
        from_lng: Number(inst.lng),
        to_zone: bestZone,
        to_coords: zoneCoordinates[bestZone]
      }

    })

    res.json(drift) // ✅ IMPORTANT

  } catch (err) {

    console.error("drift error:", err)

    res.status(500).json({
      error: "drift_failed"
    })

  }

})

router.get("/zones", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, zone_code, zone_name, min_lat, max_lat, min_lng, max_lng
      FROM geo_zones
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("zones fetch error:", err);
    res.status(500).json({ error: "zones_fetch_failed" });
  }
});


router.get("/instructor-active-lesson/:id", async (req, res) => {

  const { id } = req.params;

  const result = await pool.query(`
    SELECT *
    FROM active_lessons_projection
    WHERE instructor_id = $1
    LIMIT 1
  `, [id]);

  res.json(result.rows[0] || null);
});


export default router;
