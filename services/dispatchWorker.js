import pool from "../db.js";
import { resolveZone } from "./zoneResolver.js";
import { v4 as uuidv4 } from "uuid";
import { emitToInstructor } from "./wsService.js";
import { rebuildProjections } from "./projectionRebuildService.js";
import { findStudentByRequest } from '../services/studentProjectionHelpers.js';
import { updateStudentState } from '../services/studentProjectionWriter.js';
import { insertEvent } from "./eventStore.js";

const MAX_ACTIVE_OFFERS_PER_INSTRUCTOR = 3;
const MAX_WAVES = 3;
const WAVE_TIMEOUT_SECONDS = 20;

let lastRebuildTime = Date.now();
const REBUILD_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export function startDispatchWorker() {
  
  console.log("🔥 DISPATCH WORKER OFFER RUNNING");

  let workerRunning = false;

setInterval(async () => {

  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {

    await processExpiredWaves();

  } catch (err) {

    console.error("Dispatch worker error:", err);

  } finally {

    workerRunning = false;

  }

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
     
     if (Date.now() - lastRebuildTime > REBUILD_INTERVAL_MS) {
  console.log("♻ Rebuilding fairness projection...");
  await rebuildFairnessProjection(client);
  lastRebuildTime = Date.now();
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
console.log("🔥 INSERT 83 HIT");
  await insertEvent(client, {
  id: uuidv4(),
  identity_id: requestId,
  event_type: "lesson_request_wave_completed",
  payload: {
    wave: currentWave,
    reason: "timeout"
  }
});

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
console.log("🔥 INSERT 113 HIT");
    await insertEvent(client, {
  id: uuidv4(),
  identity_id: requestId,
  event_type: "lesson_request_expired",
  payload: {
    reason: "no_instructor_accepted"
  }
});

    return;
  }

    // 3️⃣ Attempt next wave via sendNextWaveOffers
  const nextWave = currentWave + 1;

  try {
    console.log("👉 CALLING DISPATCH for request:", requestId);
    await sendNextWaveOffers(client, requestId, nextWave);
   console.log("✅ DISPATCH FINISHED for request:", requestId);
  } catch (err) {
    console.error("DISPATCH ERROR:", err);
  }

} // ← closes handleExpiredWave

// =======================================================
// Dispatch next wave
// =======================================================
export async function sendNextWaveOffers(client, requestId, wave) {


  console.log("🚀 DISPATCH START", { requestId, wave });


  // 🛑 STOP DISPATCH IF ALREADY ACCEPTED

const acceptedCheck = await client.query(`
  SELECT 1
  FROM lesson_offer_negotiation_projection
  WHERE lesson_request_id = $1
    AND status = 'accepted'
  LIMIT 1
`, [requestId]);

if (acceptedCheck.rows.length > 0) {
  console.log("🛑 STOP DISPATCH — already accepted:", requestId);
  return;
}


  // 🔥 STEP 1 — Fetch request data ONCE
  const { rows } = await client.query(`
  SELECT
    payload->>'zone_id' AS zone_id,
    payload->>'student_id' AS student_id,
    payload->>'requested_start_time' AS requested_start_time,
    payload->>'requested_end_time' AS requested_end_time
  FROM event
  WHERE identity_id = $1
  AND event_type = 'lesson_requested'
  ORDER BY created_at ASC
  LIMIT 1
`, [requestId]);

  if (!rows.length) {
    console.log("❌ No lesson_requested event found");
    return;
  }

  const zoneId = Number(rows[0].zone_id);
  const studentId = rows[0].student_id || null;
  const requested_start_time = rows[0].requested_start_time;
  const requested_end_time = rows[0].requested_end_time;

  console.log("📍 DISPATCH ZONE:", zoneId);

  // 🔥 STEP 2 — Already offered instructors
  const { rows: offeredRows } = await client.query(`
    SELECT instructor_id
    FROM event
    WHERE identity_id = $1
    AND event_type = 'lesson_offer_sent'
  `, [requestId]);

  const offeredIds = offeredRows.map(r => r.instructor_id);

  // 🔥 STEP 3 — Adaptive wave size
  const { rows: waveRow } = await client.query(`
    SELECT suggested_wave_size
    FROM marketplace_liquidity_pressure
    WHERE id = true
  `);

  const adaptiveWaveSize =
    waveRow.length > 0
      ? parseInt(waveRow[0].suggested_wave_size)
      : 1;

  // 🔥 STEP 4 — Demand multiplier
  let demandMultiplier = 1;

  if (studentId) {
    const { rows: reliabilityRows } = await client.query(`
      SELECT reliability_score
      FROM student_reliability
      WHERE student_id = $1
    `, [studentId]);

    const reliability =
      reliabilityRows.length > 0
        ? parseFloat(reliabilityRows[0].reliability_score)
        : 0;

    if (reliability < 0) demandMultiplier = 0.5;
    else if (reliability < 0.2) demandMultiplier = 0.75;
  }

  const dynamicWaveSize = Math.max(
    1,
    Math.floor(adaptiveWaveSize * demandMultiplier)
  );

  console.log("📊 Wave:", {
    dynamicWaveSize,
    adaptiveWaveSize,
    demandMultiplier
  });


// 🛑 STOP if already confirmed
const confirmed = await client.query(`
  SELECT 1
  FROM event
  WHERE identity_id = $1
  AND event_type = 'lesson_confirmed'
  LIMIT 1
`, [requestId]);

if (confirmed.rows.length > 0) {
  console.log("🛑 STOP DISPATCH — already confirmed:", requestId);
  return;
}

  // 🔥 STEP 5 — Candidate selection
/*
  const { rows: candidates } = await client.query(
    `
SELECT
  online.instructor_id,
  COALESCE(icz.zone_id, i.home_zone_id) AS instructor_zone

FROM current_online_instructors online

LEFT JOIN instructor_current_zone icz
  ON icz.instructor_id = online.instructor_id

LEFT JOIN identity i
  ON online.instructor_id = i.id

LEFT JOIN instructor_scoring s
  ON online.instructor_id = s.instructor_id

LEFT JOIN zone_distance_matrix zdm
  ON zdm.from_zone_id = COALESCE(icz.zone_id, i.home_zone_id)
 AND zdm.to_zone_id = $4

LEFT JOIN instructor_zone_supply_projection izsp
  ON i.home_zone_id = izsp.zone_id

LEFT JOIN current_instructor_active_offers capacity
  ON online.instructor_id = capacity.instructor_id

WHERE online.instructor_id <> ALL($1::uuid[])
AND COALESCE(capacity.active_offers, 0) < $3

ORDER BY
(
  COALESCE(s.economic_score, 0)

  + CASE WHEN i.home_zone_id = $4 THEN 0.20 ELSE 0 END

  + CASE
      WHEN i.home_zone_id = $4
      THEN COALESCE(izsp.drain_risk_score, 0) * 0.20
      ELSE 0
    END

  - COALESCE(zdm.penalty_score, 0)

  - CASE
      WHEN i.home_zone_id = $4 THEN 0
      ELSE COALESCE(izsp.drain_risk_score, 0) * 0.15
    END
) DESC,

COALESCE(s.offers_last_24h, 0) ASC,
COALESCE(s.last_offer_at, '1970-01-01') ASC,
online.instructor_id ASC

LIMIT $2
`,
    [
      offeredIds.length
        ? offeredIds
        : ['00000000-0000-0000-0000-000000000000'],
      dynamicWaveSize,
      MAX_ACTIVE_OFFERS_PER_INSTRUCTOR,
     zoneId
    ]
  );

*/

// 🧪 TEMP BYPASS — IGNORE FILTERS
const { rows: candidates } = await client.query(`
  SELECT instructor_id
  FROM current_instructor_runtime_state
  WHERE runtime_state = 'instructor_online'
`);

console.log("🧪 BYPASS CANDIDATES:", candidates);


console.log("🔥 SIMPLE CANDIDATES:", candidates);
console.log("🔥 CANDIDATE COUNT:", candidates.length);

  // 🔥 STEP 6 — No candidates → expire
  if (candidates.length === 0) {
    console.log("❌ No instructors available");
    console.log("🔥 INSERT 297 HIT");

     const eventId = uuidv4();

await insertEvent(client, {
  id: eventId,
  identity_id: requestId,
  event_type: "lesson_request_expired",
  payload: {
    reason: "no_available_instructors"
  }
});

   const eventTime = new Date(); // temporary replacement

    return;
  }





  // 🔥 STEP 7 — Start dispatch wave
  const expiresAt = new Date(Date.now() + WAVE_TIMEOUT_SECONDS * 1000);
 console.log("🔥 INSERT 312 HIT");
 
await insertEvent(client, {
  id: uuidv4(),
  identity_id: requestId,
  event_type: "lesson_request_dispatch_started",
  payload: {
    wave,
    expires_at: expiresAt,
    wave_size: dynamicWaveSize
  }
});

  // 🔥 STEP 8 — Send offers
  for (const instructor of candidates) {
    console.log("🔥 INSERT 331 HIT");

    const instructorId = instructor.instructor_id;
 
    const offerId = uuidv4();

    await client.query(`
  INSERT INTO identity (id, identity_type)
  VALUES ($1, 'lesson_offer')
`, [offerId]);

   console.log("INSTRUCTOR DEBUG:", instructor);

    try {
    console.log("🔥 INSERT 339 HIT");

      await insertEvent(client, {
  id: uuidv4(),
  identity_id: offerId,
  event_type: "lesson_offer_sent",
  payload: {
    offer_id: offerId,
    lesson_request_id: requestId,
    instructor_id: instructorId,
    wave: wave
  },
  instructor_id: instructorId
});


await client.query(`
  INSERT INTO instructor_offers_projection (
    instructor_id,
    lesson_request_id,
    status,
    created_at
  )
  VALUES ($1, $2, 'pending', NOW())
  ON CONFLICT DO NOTHING
`, [
  instructorId,
  requestId
]);



// 🧠 OFFER NEGOTIATION INSERT

const existingOffer = await client.query(`
  SELECT 1
  FROM lesson_offer_negotiation_projection
  WHERE offer_id = $1
`, [offerId]);

if (existingOffer.rowCount === 0) {

  console.log("📦 CREATE OFFER NEGOTIATION:", offerId);
}

  const result = await client.query(`
  INSERT INTO lesson_offer_negotiation_projection (
    offer_id,
    lesson_request_id,
    instructor_id,
    student_id,
    status,
    last_response_by,
    original_start_time,
    original_end_time,
    proposed_start_time,
    proposed_end_time,
    created_at,
    updated_at
  )
  VALUES ($1,$2,$3,$4,'sent','student',$5,$6,$5,$6,NOW(),NOW())
  ON CONFLICT (lesson_request_id, instructor_id)
  DO NOTHING
`, [
  offerId,
  requestId,
  instructorId,
  studentId,
  requested_start_time,
  requested_end_time
]);

if (result.rowCount === 0) {
  console.log("⛔ OFFER ALREADY EXISTS — SKIP", instructorId);
}


     console.log("INSTRUCTOR OBJECT:", instructor)
      console.log("✅ Offer sent →", instructorId);

     emitToInstructor(instructorId, {
     type: "new_offer"
     });


    } catch (err) {
     
      console.error("❌ Offer failed:", err.message);
    }
  }
}



async function rebuildFairnessProjection(client) {
  await client.query(`
    DELETE FROM instructor_offer_stats;
  `);

  await client.query(`
    INSERT INTO instructor_offer_stats (
      instructor_id,
      offers_last_24h,
      confirmed_last_24h,
      last_offer_at
    )
    SELECT
      instructor_id,
      COUNT(*) FILTER (
        WHERE event_type = 'lesson_offer_sent'
        AND created_at > NOW() - INTERVAL '24 hours'
      ),
      COUNT(*) FILTER (
        WHERE event_type = 'lesson_confirmed'
        AND created_at > NOW() - INTERVAL '24 hours'
      ),
      MAX(created_at) FILTER (
        WHERE event_type = 'lesson_offer_sent'
      )
    FROM event
    WHERE event_type IN ('lesson_offer_sent','lesson_confirmed')
    AND instructor_id IS NOT NULL
    GROUP BY instructor_id;
  `);
}


