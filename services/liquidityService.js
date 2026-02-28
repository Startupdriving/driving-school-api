import db from "../db.js"; // adjust if needed

export async function rebuildLiquidity() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch all zones
    const { rows: zones } = await client.query(`
      SELECT id FROM geo_zones
    `);

    for (const zone of zones) {
      const zoneId = zone.id;

      // 2️⃣ Count online instructors in zone
      const { rows: onlineRows } = await client.query(`
        SELECT COUNT(*)::int AS online
        FROM current_online_instructors online
        JOIN identity i ON online.instructor_id = i.id
        WHERE i.home_zone_id = $1
      `, [zoneId]);

      const online = onlineRows[0].online;

      // 3️⃣ Count recent requests (5 minutes)
      const { rows: requestRows } = await client.query(`
        SELECT COUNT(*)::int AS recent_requests
        FROM event
        WHERE event_type = 'lesson_requested'
        AND (payload->>'zone_id')::int = $1
        AND created_at > NOW() - INTERVAL '5 minutes'
      `, [zoneId]);

      const recentRequests = requestRows[0].recent_requests;

      // 4️⃣ Compute pressure
      const pressure = recentRequests / Math.max(online, 1);

      // 5️⃣ Compute raw wave size
      let rawWave = Math.ceil(pressure * 2);

      // Clamp raw between 1 and 5
      rawWave = Math.max(1, Math.min(5, rawWave));

      // 6️⃣ Get previous smoothed value
      const { rows: prevRows } = await client.query(`
        SELECT smoothed_wave_size
        FROM zone_liquidity_pressure
        WHERE zone_id = $1
      `, [zoneId]);

      const previousSmoothed = prevRows.length > 0
        ? parseFloat(prevRows[0].smoothed_wave_size)
        : 1;

      // 7️⃣ Apply smoothing (EWMA)
      let smoothed = previousSmoothed * 0.7 + rawWave * 0.3;

      // 8️⃣ Oscillation clamp (±1 per cycle)
      const maxUp = previousSmoothed + 1;
      const maxDown = previousSmoothed - 1;

      smoothed = Math.min(smoothed, maxUp);
      smoothed = Math.max(smoothed, maxDown);

      // 9️⃣ Suggested wave
      const suggested = Math.round(smoothed);

      // 🔟 Update table
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

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Zone liquidity rebuild failed:", err);
  } finally {
    client.release();
  }
}
