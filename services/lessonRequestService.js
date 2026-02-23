import { v4 as uuidv4 } from "uuid";
import { withIdempotency } from "./idempotencyService.js";
import crypto from "crypto";

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

      // 1️⃣ Insert lesson_requested event
await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    payload,
    lesson_range
  )
  VALUES (
    $1,
    $1,
    'lesson_requested',
    $2,
    tstzrange($3::timestamptz, $4::timestamptz)
  )
  `,
   [
    requestId,
    JSON.stringify({
      student_id,
      requested_start_time,
      requested_end_time,
      pickup_lat,
      pickup_lng
    }),
    requested_start_time,
    requested_end_time
  ]
);


      // 2️⃣ Insert lesson_request_dispatch_started (Wave 1)

      const WAVE_SIZE = 3;
      const WAVE_TIMEOUT_SECONDS = 300;

      const expiresAt = new Date(
      Date.now() + WAVE_TIMEOUT_SECONDS * 1000
      );

      await client.query(
      `
      INSERT INTO event (
      id,
      identity_id,
      event_type,
      payload
      )
      VALUES (
      $1,
      $2,
      'lesson_request_dispatch_started',
      $3
       )
  `,
  [
    uuidv4(),
    requestId,
    JSON.stringify({
      wave: 1,
      expires_at: expiresAt,
      wave_size: WAVE_SIZE
    })
  ]
);

      // AUTO MATCHING (Top 3 eligible instructors)
      const eligible = await client.query(
        `
        SELECT i.id
        FROM identity i
        JOIN current_online_instructors o
          ON i.id = o.instructor_id
        WHERE i.identity_type = 'instructor'
        AND NOT EXISTS (
          SELECT 1 FROM event e
          WHERE e.instructor_id = i.id
          AND e.event_type = 'lesson_scheduled'
          AND e.lesson_range && tstzrange($1::timestamptz, $2::timestamptz)
          AND NOT EXISTS (
            SELECT 1 FROM event c
            WHERE c.identity_id = e.identity_id
            AND c.event_type = 'lesson_cancelled'
          )
        )
        LIMIT 3
        `,
        [requested_start_time, requested_end_time]
      );

      for (const row of eligible.rows) {
        await client.query(
  `
  INSERT INTO event (
    id,
    identity_id,
    event_type,
    instructor_id,
    payload
  )
  VALUES (
    $1,
    $2,
    'lesson_offer_sent',
    $3,
    $4
  )
  `,
  [
    generateUUID(),   // event UUID
    requestId,        // lesson_request identity
    row.id,           // instructor_id column
    JSON.stringify({
      wave: 1
    })
  ]
);
      }

      return {
        message: "Lesson request created and offers dispatched",
        lesson_request_id: requestId,
        offers_sent: eligible.rows.map(r => r.id)
      };

    });

    res.status(201).json(response);

  } catch (err) {
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

      // Create lesson identity
      const lessonId = generateUUID();

      await client.query(
        `
        INSERT INTO identity (id, identity_type)
        VALUES ($1, 'lesson')
        `,
        [lessonId]
      );

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

// ============================
// FINANCIAL ENGINE START
// ============================

// 1️⃣ Fixed lesson price (later dynamic)
const lessonPrice = 2000; // PKR

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
      lesson_id: lessonId,
      amount: lessonPrice,
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
