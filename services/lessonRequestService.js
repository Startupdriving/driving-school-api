import { rebuildProjections } from "./projectionRebuildService.js";
import { sendNextWaveOffers } from "./dispatchWorker.js";
import { v4 as uuidv4 } from "uuid";
import { withIdempotency } from "./idempotencyService.js";
import crypto from "crypto";
import { upsertStudentState } from '../services/studentProjectionWriter.js';



function generateUUID() {
  return crypto.randomUUID();
}

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/* =====================================================
   REQUEST LESSON (AUTO-OFFER ENGINE)
===================================================== */
export async function requestLesson(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const {
  student_id,
  requested_start_time,
  requested_end_time,
  pickup_lat,
  pickup_lng
} = req.body;

      if (
  !student_id ||
  !requested_start_time ||
  !requested_end_time ||
  pickup_lat === undefined ||
  pickup_lng === undefined
) {
  throw new Error(
    "student_id, requested_start_time, requested_end_time, pickup_lat, pickup_lng required"
  );
}

      if (!isValidUUID(student_id)) {
        throw new Error("Invalid student_id");
      }

      // Validate active student
      const studentCheck = await client.query(
        `SELECT 1 FROM current_active_students WHERE id = $1`,
        [student_id]
      );

      if (studentCheck.rowCount === 0) {
        throw new Error("Student not active");
      }

      const requestId = generateUUID();

      // Create identity
      await client.query(
        `INSERT INTO identity (id, identity_type)
         VALUES ($1, 'lesson_request')`,
        [requestId]
      );

// 🔥 Resolve geographic zone
const { rows: zoneRows } = await client.query(
  `
  SELECT resolve_zone_id($1, $2) AS zone_id
  `,
  [pickup_lat, pickup_lng]
);

const zoneId = zoneRows.length > 0
  ? zoneRows[0].zone_id
  : null;

      // 1️⃣ Insert lesson_requested event
console.log("INSERT lesson_requested event");

      await client.query(
  `INSERT INTO event (
     id,
     identity_id,
     event_type,
     payload
   )
   VALUES (
     $1,
     $2,
     'lesson_requested',
     $3
   )`,
  [
    uuidv4(),
    requestId,
    JSON.stringify({
      student_id,
      requested_start_time,
      requested_end_time,
      pickup_lat,
      pickup_lng,
      zone_id: zoneId
    })
  ]
);


// 🧠 NEGOTIATION PROJECTION INSERT (FIRST STATE)

console.log("🔥 NEGOTIATION HOOK FILE HIT");

const existingNegotiation = await client.query(`
  SELECT 1
  FROM lesson_negotiation_projection
  WHERE lesson_request_id = $1
`, [requestId]);

if (existingNegotiation.rowCount === 0) {

  console.log("🧠 CREATE NEGOTIATION STATE:", requestId);

  await client.query(`
    INSERT INTO lesson_negotiation_projection (
      lesson_request_id,
      student_id,
      status,
      last_response_by,
      original_start_time,
      original_end_time,
      proposed_start_time,
      proposed_end_time,
      response_count,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2,
      'pending',
      'student',
      $3, $4,
      $3, $4,
      0,
      NOW(),
      NOW()
    )
  `, [
    requestId,
    student_id,
    requested_start_time,
    requested_end_time
  ]);

} else {
  console.log("⛔ NEGOTIATION ALREADY EXISTS — SKIP");
}


// ✅ 2️⃣ STUDENT PROJECTION UPDATE (SAME TRANSACTION)
// 🔥 ONLY RESET IF NO ACTIVE/CONFIRMED LESSON
const existing = await client.query(`
  SELECT status
  FROM student_active_lesson_projection
  WHERE student_id = $1
`, [student_id]);

// 🔥 STRICT STATE MACHINE ENFORCEMENT

const existingState = existing.rows[0];

if (
  existingState &&
  !['completed', 'cancelled'].includes(existingState.status) &&
  existingState.lesson_id // only block if real lesson exists
) {
  throw new Error("Active lesson already exists");
}



// 🧠 STEP 2 — THEN RESET
await upsertStudentState(client, {
  student_id,
  lesson_request_id: requestId,
  status: 'searching',
  requested_at: new Date(),
  lesson_id: null,
  instructor_id: null,
  confirmed_at: null,
  started_at: null,
  completed_at: null,
  cancelled_at: null
});

console.log("🔥 RESET STUDENT STATE:", student_id);


      await sendNextWaveOffers(client, requestId, 1);
      return {
        message: "Lesson request created and offers dispatched",
        lesson_request_id: requestId
      };

    });

    res.status(201).json(response);

  } catch (err) {
console.error("FULL ERROR:", err);
    res.status(400).json({ error: err.message });
  }
}


/* c=====================================================
   ACCEPT OFFER (RACE-SAFE, ATOMIC)
===================================================== */
export async function acceptOffer(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const { lesson_request_id, instructor_id, car_id } = req.body;

      if (!lesson_request_id || !instructor_id || !car_id) {
        throw new Error("lesson_request_id, instructor_id, car_id required");
      }

      const requestId = lesson_request_id;
      const instructorId = instructor_id;
      const carId = car_id;

      // 🔒 Lock lesson_request
      const lockRequest = await client.query(
        `
        SELECT id
        FROM identity
        WHERE id = $1
        AND identity_type = 'lesson_request'
        FOR UPDATE
        `,
        [requestId]
      );

      if (lockRequest.rowCount === 0) {
        throw new Error("Lesson request not found");
      }

      // ============================
      // VALIDATION SECTION
      // ============================

      // Reject if expired
      const expiredCheck = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_request_expired'
        LIMIT 1
        `,
        [requestId]
      );

      if (expiredCheck.rowCount > 0) {
        throw new Error("Request already expired");
      }

      // Reject if already confirmed
      const confirmedCheck = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_confirmed'
        LIMIT 1
        `,
        [requestId]
      );

      if (confirmedCheck.rowCount > 0) {
        throw new Error("Request already confirmed");
      }

      // Get current wave
      const currentWaveResult = await client.query(
        `
        SELECT (payload->>'wave')::int AS wave
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_request_dispatch_started'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [requestId]
      );

      if (currentWaveResult.rowCount === 0) {
        throw new Error("No active dispatch wave");
      }

      const currentWave = currentWaveResult.rows[0].wave;

      // Verify instructor was offered in current wave
      const offerResult = await client.query(
        `
        SELECT (payload->>'wave')::int AS wave
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_offer_sent'
        AND instructor_id = $2
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [requestId, instructorId]
      );
     console.log("🔥 LESSON REQUEST SERVICE OFFER RUNNING");
      if (offerResult.rowCount === 0) {
        throw new Error("No offer found for instructor");
      }

      const offerWave = offerResult.rows[0].wave;

      if (offerWave !== currentWave) {
        throw new Error("Offer belongs to inactive wave");
      }

      // Ensure wave not completed
      const waveCompletedCheck = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_request_wave_completed'
        AND (payload->>'wave')::int = $2
        LIMIT 1
        `,
        [requestId, currentWave]
      );

      if (waveCompletedCheck.rowCount > 0) {
        throw new Error("Wave already completed");
      }

      // ============================
      // END VALIDATION
      // ============================

      // Get request details
      const requestInfo = await client.query(
        `
        SELECT lower(lesson_range) AS start_time,
               upper(lesson_range) AS end_time,
               payload->>'student_id' AS student_id
        FROM event
        WHERE identity_id = $1
        AND event_type = 'lesson_requested'
        `,
        [requestId]
      );

      if (requestInfo.rowCount === 0) {
        throw new Error("Request details not found");
      }

      const { start_time, end_time, student_id } = requestInfo.rows[0];

      // Insert lesson_offer_accepted
      await client.query(
        `
        INSERT INTO event (
          id,
          identity_id,
          event_type,
          instructor_id,
          payload
        )
        VALUES ($1, $2, 'lesson_offer_accepted', $3, $4)
        `,
        [
          generateUUID(),
          requestId,
          instructorId,
          JSON.stringify({ wave: currentWave })
        ]
      );

      // Insert lesson_confirmed
      await client.query(
        `
        INSERT INTO event (
          id,
          identity_id,
          event_type,
          instructor_id,
          payload
        )
        VALUES ($1, $2, 'lesson_confirmed', $3, $4)
        `,
        [
          generateUUID(),
          requestId,
          instructorId,
          JSON.stringify({ wave: currentWave })
        ]
      );


// ✅ STUDENT PROJECTION UPDATE (confirmed)

const studentId = await findStudentByRequest(requestId);

if (studentId) {
  await updateStudentState(client, studentId, {
    status: 'confirmed',
    instructor_id: instructorId,
    confirmed_at: new Date()
  });
}


// 🔥 Update fairness projection for confirmation
console.log("🔥 INSERT 331 HIT");
await client.query(
  `
  UPDATE instructor_offer_stats
  SET confirmed_last_24h = confirmed_last_24h + 1,
      updated_at = NOW()
  WHERE instructor_id = $1
  `,
  [instructorId]
);

      // Create lesson identity
      const lessonId = uuidv4();
console.log("🔥 INSERT 339 HIT");
await client.query(`
INSERT INTO identity(id, identity_type)
VALUES ($1,'lesson')
`, [lessonId]);

await client.query(`
INSERT INTO event (
  id,
  identity_id,
  event_type,
  instructor_id,
  payload
)
VALUES ($1,$2,'lesson_created',$3,$4)
`, [
  uuidv4(),
  lessonId,
  instructorId,
  JSON.stringify({ lesson_request_id: requestId })
]);

      // Insert lesson_scheduled
await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    payload,
    instructor_id,
    car_id,
    lesson_range
  )
  VALUES (
    $1,
    $1,
    'lesson_scheduled',
    $2,
    $3,
    $4,
    tstzrange($5::timestamptz, $6::timestamptz)
  )
  `,
  [
    lessonId,
    JSON.stringify({
      student_id,
      instructor_id: instructorId,
      car_id: carId,
      start_time,
      end_time
    }),
    instructorId,
    carId,
    start_time,
    end_time
  ]
);


// 🔹 Fetch zone_id from lesson request
const { rows: zoneRows } = await client.query(`
  SELECT (payload->>'zone_id')::int AS zone_id
  FROM event
  WHERE identity_id = $1
  AND event_type = 'lesson_requested'
  LIMIT 1
`, [requestId]);

const zoneId = zoneRows.length > 0 ? zoneRows[0].zone_id : null;

let surgeMultiplier = 1;

if (zoneId) {
  const { rows: surgeRows } = await client.query(`
    SELECT surge_multiplier
    FROM zone_pricing_projection
    WHERE zone_id = $1
  `, [zoneId]);

  surgeMultiplier = surgeRows.length > 0
    ? parseFloat(surgeRows[0].surge_multiplier)
    : 1;
}
// ============================
// FINANCIAL ENGINE START
// ============================

// 1️⃣ Fixed lesson price (later dynamic)
const basePrice = 2000; // PKR base price
const lessonPrice = Math.round(basePrice * surgeMultiplier);

// Insert lesson_price_calculated under lesson identity
await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    payload
  )
  VALUES ($1, $2, 'lesson_price_calculated', $3)
  `,
  [
    generateUUID(),
    lessonId,
    JSON.stringify({
      price: lessonPrice,
      currency: "PKR"
    })
  ]
);

// 2️⃣ Create payment identity
const paymentId = generateUUID();

await client.query(
  `
  INSERT INTO identity (id, identity_type)
  VALUES ($1, 'payment')
  `,
  [paymentId]
);

// 3️⃣ Insert payment_created
await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    payload
  )
  VALUES ($1, $2, 'payment_created', $3)
  `,
  [
    generateUUID(),
    paymentId,
    JSON.stringify({
  base_price: basePrice,
  surge_multiplier: surgeMultiplier,
  final_price: lessonPrice,
  currency: "PKR"
})
  ]
);

// 4️⃣ Insert payment_requested
await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    payload
  )
  VALUES ($1, $2, 'payment_requested', $3)
  `,
  [
    generateUUID(),
    paymentId,
    JSON.stringify({
      lesson_id: lessonId
    })
  ]
);

// ============================
// FINANCIAL ENGINE END
// ============================

return {
  message: "Offer accepted and lesson scheduled",
  lesson_id: lessonId,
  payment_id: paymentId
};

      return {
        message: "Offer accepted and lesson scheduled",
        lesson_id: lessonId
      };

    });

    res.json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
