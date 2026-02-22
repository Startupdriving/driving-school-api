import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

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

  // 2️⃣ Check how many waves already started
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
    // 3️⃣ Expire request
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

  // 4️⃣ Start next wave
  const nextWave = currentWave + 1;
  const expiresAt = new Date(Date.now() + WAVE_TIMEOUT_SECONDS * 1000);

  await client.query(
    `
    INSERT INTO event (id, identity_id, event_type, payload)
    VALUES ($1, $2, 'lesson_request_dispatch_started', $3)
    `,
    [
      uuidv4(),
      requestId,
      JSON.stringify({
        wave: nextWave,
        expires_at: expiresAt,
        wave_size: WAVE_SIZE
      })
    ]
  );

  // 5️⃣ Send new offers
  await sendNextWaveOffers(client, requestId, nextWave);
}


async function sendNextWaveOffers(client, requestId, wave) {

  // Instructors already offered
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
    SELECT i.instructor_id
    FROM current_online_instructors i
    WHERE i.instructor_id <> ALL($1::uuid[])
    LIMIT $2
    `,
    [
      offeredIds.length
        ? offeredIds
        : ['00000000-0000-0000-0000-000000000000'],
      WAVE_SIZE
    ]
  );

  // 🔥 NEW: If no candidates → expire immediately
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

    return; // stop processing — do NOT create new wave
  }

  // Insert offers for next wave
  for (const instructor of candidates) {
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
        instructor.instructor_id,
        JSON.stringify({ wave })
      ]
    );
  }
}
