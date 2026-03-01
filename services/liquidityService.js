import db from "../db.js";

export async function rebuildLiquidity() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // =========================================================
    // 1️⃣ ZONE LIQUIDITY PRESSURE REBUILD (PER ZONE)
    // =========================================================

    const { rows: zones } = await client.query(`
      SELECT id FROM geo_zones
    `);

    for (const zone of zones) {
      const zoneId = zone.id;

      // Count online instructors in zone
      const { rows: onlineRows } = await client.query(`
        SELECT COUNT(*)::int AS online
        FROM current_online_instructors online
        JOIN identity i ON online.instructor_id = i.id
        WHERE i.home_zone_id = $1
      `, [zoneId]);

      const online = onlineRows[0].online;

      // Count recent requests (last 5 minutes)
      const { rows: requestRows } = await client.query(`
        SELECT COUNT(*)::int AS recent_requests
        FROM event
        WHERE event_type = 'lesson_requested'
        AND (payload->>'zone_id')::int = $1
        AND created_at > NOW() - INTERVAL '5 minutes'
      `, [zoneId]);

      const recentRequests = requestRows[0].recent_requests;

      // Compute pressure
      const pressure = recentRequests / Math.max(online, 1);

      // Raw wave size
      let rawWave = Math.ceil(pressure * 2);

      // Clamp raw between 1 and 5
      rawWave = Math.max(1, Math.min(5, rawWave));

      // Get previous smoothed value
      const { rows: prevRows } = await client.query(`
        SELECT smoothed_wave_size
        FROM zone_liquidity_pressure
        WHERE zone_id = $1
      `, [zoneId]);

      const previousSmoothed = prevRows.length > 0
        ? parseFloat(prevRows[0].smoothed_wave_size)
        : 1;

      // EWMA smoothing
      let smoothed = previousSmoothed * 0.7 + rawWave * 0.3;

      // Oscillation clamp (±1 per cycle)
      const maxUp = previousSmoothed + 1;
      const maxDown = previousSmoothed - 1;

      smoothed = Math.min(smoothed, maxUp);
      smoothed = Math.max(smoothed, maxDown);

      const suggested = Math.round(smoothed);

      // Update zone_liquidity_pressure
      await client.query(`
        UPDATE zone_liquidity_pressure
        SET
          online_instructors = $1,
          recent_requests_5m = $2,
          raw_wave_size = $3,
          smoothed_wave_size = $4,
          suggested_wave_size = $5,
          updated_at = NOW()
        WHERE zone_id = $6
      `, [
        online,
        recentRequests,
        rawWave,
        smoothed,
        suggested,
        zoneId
      ]);
    }

    // =========================================================
    // 2️⃣ INSTRUCTOR ZONE SUPPLY PROJECTION REBUILD (ONCE)
    // =========================================================

    await client.query(`
      WITH zone_online AS (
          SELECT i.home_zone_id AS zone_id,
                 COUNT(*) AS online_count
          FROM current_online_instructors o
          JOIN identity i ON i.id = o.instructor_id
          WHERE i.home_zone_id IS NOT NULL
          GROUP BY i.home_zone_id
      ),
      zone_busy AS (
          SELECT i.home_zone_id AS zone_id,
                 COUNT(*) AS busy_count
          FROM current_instructor_active_offers c
          JOIN identity i ON i.id = c.instructor_id
          WHERE i.home_zone_id IS NOT NULL
          GROUP BY i.home_zone_id
      ),
      zone_calc AS (
          SELECT
              z.id AS zone_id,
              COALESCE(zo.online_count, 0) AS online_instructors,
              COALESCE(zb.busy_count, 0) AS busy_instructors
          FROM geo_zones z
          LEFT JOIN zone_online zo ON z.id = zo.zone_id
          LEFT JOIN zone_busy zb ON z.id = zb.zone_id
      )

      INSERT INTO instructor_zone_supply_projection (
          zone_id,
          online_instructors,
          busy_instructors,
          available_instructors,
          supply_ratio,
          drain_risk_score,
          updated_at
      )
      SELECT
          zone_id,
          online_instructors,
          busy_instructors,
          GREATEST(online_instructors - busy_instructors, 0),

          CASE
              WHEN online_instructors = 0 THEN 0
              ELSE ROUND(
                  (GREATEST(online_instructors - busy_instructors, 0)::numeric
                   / online_instructors::numeric),
                  4
              )
          END,

          CASE
              WHEN online_instructors = 0 THEN 0
              ELSE ROUND(
                  1 - (
                      GREATEST(online_instructors - busy_instructors, 0)::numeric
                      / online_instructors::numeric
                  ),
                  4
              )
          END,

          NOW()

      FROM zone_calc
      ON CONFLICT (zone_id)
      DO UPDATE SET
          online_instructors = EXCLUDED.online_instructors,
          busy_instructors = EXCLUDED.busy_instructors,
          available_instructors = EXCLUDED.available_instructors,
          supply_ratio = EXCLUDED.supply_ratio,
          drain_risk_score = EXCLUDED.drain_risk_score,
          updated_at = NOW();
    `);

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Liquidity rebuild failed:", err);
  } finally {
    client.release();
  }
}
