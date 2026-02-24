import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

const MAX_ACTIVE_OFFERS_PER_INSTRUCTOR = 3;
const WAVE_SIZE = 3;
const MAX_WAVES = 3;
const WAVE_TIMEOUT_SECONDS = 300;

export function startDispatchWorker() {
  console.log("🚀 Dispatch worker started");

  setInterval(async () => {
    await processExpiredWaves();
  }, 5000);
}

async function processExpiredWaves() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(`
  SELECT r.request_id, r.current_wave
  FROM expirable_lesson_requests r
  JOIN identity i ON i.id = r.request_id
  WHERE r.expires_at < NOW()
  AND r.is_confirmed = false
  AND r.is_expired = false
  AND r.current_wave_completed = false
  FOR UPDATE OF i SKIP LOCKED
`);

    for (const row of rows) {
      await handleExpiredWave(client, row.request_id, row.current_wave);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Dispatch worker error:", err);
  } finally {
    client.release();
  }
}

async function handleExpiredWave(client, requestId, currentWave) {

  // 1️⃣ Append wave_completed
  await client.query(
    `
    INSERT INTO event (id, identity_id, event_type, payload)
    VALUES ($1, $2, 'lesson_request_wave_completed', $3)
    `,
    [
      uuidv4(),
      requestId,
      JSON.stringify({
        wave: currentWave,
        reason: "timeout"
      })
    ]
  );

  // 2️⃣ Count how many waves already started
  const { rows } = await client.query(
    `
    SELECT COUNT(*)::int AS wave_count
    FROM event
    WHERE identity_id = $1
    AND event_type = 'lesson_request_dispatch_started'
    `,
    [requestId]
  );

  const waveCount = rows[0].wave_count;

  if (waveCount >= MAX_WAVES) {
    // Expire due to max waves
    await client.query(
      `
      INSERT INTO event (id, identity_id, event_type, payload)
      VALUES ($1, $2, 'lesson_request_expired', $3)
      `,
      [
        uuidv4(),
        requestId,
        JSON.stringify({
          reason: "no_instructor_accepted"
        })
      ]
    );

    return;
  }

  // 3️⃣ Attempt next wave via sendNextWaveOffers
  const nextWave = currentWave + 1;

  await sendNextWaveOffers(client, requestId, nextWave);
}



async function sendNextWaveOffers(client, requestId, wave) {

  // Already offered instructors
  const { rows: offeredRows } = await client.query(
    `
    SELECT instructor_id
    FROM event
    WHERE identity_id = $1
    AND event_type = 'lesson_offer_sent'
    `,
    [requestId]
  );

  const offeredIds = offeredRows.map(r => r.instructor_id);

  // Select next eligible instructors
  
const { rows: candidates } = await client.query(
  `
  SELECT o.instructor_id
  FROM current_online_instructors o
  LEFT JOIN instructor_offer_stats s
    ON o.instructor_id = s.instructor_id
  WHERE o.instructor_id <> ALL($1::uuid[])
  AND o.active_offers < $3
  ORDER BY
  COALESCE(
    (s.confirmed_last_24h::float /
     NULLIF(s.offers_last_24h, 0)
    ), 0
  ) DESC,
  COALESCE(s.offers_last_24h, 0) ASC,
  COALESCE(s.last_offer_at, '1970-01-01') ASC,
  o.instructor_id ASC
  LIMIT $2
  `,
  [
    offeredIds.length
      ? offeredIds
      : ['00000000-0000-0000-0000-000000000000'],
    WAVE_SIZE,
    MAX_ACTIVE_OFFERS_PER_INSTRUCTOR
  ]
);

  // If no candidates → expire immediately
  if (candidates.length === 0) {

    await client.query(
      `
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        payload
      )
      VALUES ($1, $2, 'lesson_request_expired', $3)
      `,
      [
        uuidv4(),
        requestId,
        JSON.stringify({ reason: "no_available_instructors" })
      ]
    );

    return;
  }

  // 🔥 Start next wave ONLY if candidates exist
  const expiresAt = new Date(Date.now() + WAVE_TIMEOUT_SECONDS * 1000);

  await client.query(
    `
    INSERT INTO event (
      id,
      identity_id,
      event_type,
      payload
    )
    VALUES ($1, $2, 'lesson_request_dispatch_started', $3)
    `,
    [
      uuidv4(),
      requestId,
      JSON.stringify({
        wave,
        expires_at: expiresAt,
        wave_size: WAVE_SIZE
      })
    ]
  );

    // Insert offers + update fairness projection
  for (const instructor of candidates) {

    const instructorId = instructor.instructor_id;

    // 1️⃣ Insert lesson_offer_sent event
    await client.query(
      `
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id,
        payload
      )
      VALUES ($1, $2, 'lesson_offer_sent', $3, $4)
      `,
      [
        uuidv4(),
        requestId,
        instructorId,
        JSON.stringify({ wave })
      ]
    );

    // 2️⃣ Update fairness projection (atomic inside same transaction)
    await client.query(
      `
      INSERT INTO instructor_offer_stats (
        instructor_id,
        offers_last_24h,
        last_offer_at
      )
      VALUES ($1, 1, NOW())
      ON CONFLICT (instructor_id)
      DO UPDATE SET
        offers_last_24h = instructor_offer_stats.offers_last_24h + 1,
        last_offer_at = NOW(),
        updated_at = NOW()
      `,
      [instructorId]
    );
  }
}
