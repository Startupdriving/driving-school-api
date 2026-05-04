import { emitToStudent } from "./wsService.js";


export async function handleEvent(client, event) {
  const { event_type } = event;

console.log("⚙️ HANDLING EVENT:", event_type);

  switch (event_type) {

    case 'student_created':
      await handleStudentCreated(client, event);
    break;

    case 'instructor_created':
      await handleInstructorCreated(client, event);
    break;

    case 'lesson_scheduled':
      await handleLessonScheduled(client, event);
      break;

    case 'lesson_reschedule_accepted':
      await handleLessonRescheduleAccepted(client, event);
      break;

    case 'lesson_cancelled':
      await handleLessonCancelled(client, event);
      break;

    case "lesson_offer_countered": {
      await handleOfferCountered(client, event);


  const { rows } = await client.query(`
    SELECT student_id
    FROM lesson_offer_negotiation_projection
    WHERE offer_id = $1
    LIMIT 1
  `, [event.identity_id]);

  if (rows.length) {
    emitToStudent(rows[0].student_id, {
      type: "student_update"
    });
  }

  break;
}

    case 'lesson_offer_accepted':
      await handleOfferAccepted(client, event);
      break;

   case 'lesson_offer_sent':
     await handleOfferSent(client, event);
     break;

    default:
      console.log("⚠️ No handler for event:", event_type);
  }
}



async function handleLessonScheduled(client, event) {
  const payload = event.payload;

  await client.query(`
    INSERT INTO lesson_schedule_projection (
      lesson_request_id,
      instructor_id,
      student_id,
      start_time,
      end_time,
      status,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,'confirmed',NOW(),NOW())
    ON CONFLICT (lesson_request_id)
    DO UPDATE SET
      instructor_id = EXCLUDED.instructor_id,
      student_id = EXCLUDED.student_id,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = 'confirmed',
      updated_at = NOW()
  `, [
    event.identity_id,
    payload.instructor_id,
    payload.student_id,
    payload.start_time,
    payload.end_time
  ]);

  await client.query(`
    INSERT INTO student_active_lesson_projection (
      student_id,
      lesson_request_id,
      lesson_id,
      status,
      instructor_id,
      confirmed_at,
      updated_at
    )
    VALUES ($1,$2,$3,'confirmed',$4,NOW(),NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
      lesson_id = EXCLUDED.lesson_id,
      instructor_id = EXCLUDED.instructor_id,
      status = 'confirmed',
      confirmed_at = NOW(),
      updated_at = NOW()
  `, [
    payload.student_id,
    event.identity_id,
    event.identity_id,
    payload.instructor_id
  ]);
}



async function handleLessonCancelled(client, event) {

  await client.query(`
    UPDATE lesson_schedule_projection
    SET status = 'cancelled', updated_at = NOW()
    WHERE lesson_request_id = $1
  `, [event.identity_id]);

  await client.query(`
    UPDATE student_active_lesson_projection
    SET status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE lesson_id = $1
  `, [event.identity_id]);
}



async function handleOfferAccepted(client, event) {

  await client.query(`
    UPDATE lesson_offer_negotiation_projection
    SET status = 'accepted', updated_at = NOW()
    WHERE offer_id = $1
  `, [event.identity_id]);
}



async function handleOfferCountered(client, event) {
  const payload = event.payload;

  await client.query(`
    UPDATE lesson_offer_negotiation_projection
    SET
      proposed_start_time = $1,
      proposed_end_time = $2,
      proposed_price = $3,
      last_response_by = $4,
      response_count = response_count + 1,
      updated_at = NOW()
    WHERE offer_id = $5
  `, [
    payload.proposed_start_time,
    payload.proposed_end_time,
    payload.proposed_price,
    payload.actor,
    payload.offer_id
  ]);
}


async function handleOfferSent(client, event) {
  const payload = event.payload;

  // get request data
  const { rows } = await client.query(`
    SELECT payload
    FROM event
    WHERE identity_id = $1
      AND event_type = 'lesson_requested'
    ORDER BY created_at ASC
    LIMIT 1
  `, [payload.lesson_request_id]);

  if (!rows.length) {
    throw new Error("lesson_requested_not_found");
  }

  const request = rows[0].payload;
console.log("INSERT FROM eventHandler");
  await client.query(`
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
    VALUES (
      $1,$2,$3,$4,
      'sent',
      'student',
      $5,$6,$5,$6,
      NOW(),NOW()
    )
    ON CONFLICT (lesson_request_id, instructor_id)
    DO UPDATE SET
  updated_at = NOW()
  `, [
    payload.offer_id,
    payload.lesson_request_id,
    payload.instructor_id,
    request.student_id,
    request.requested_start_time,
    request.requested_end_time
  ]);
}


async function handleLessonRescheduleAccepted(client, event) {
  const { lesson_id } = event.payload;

  console.log("🔥 ENTER RESCHEDULE HANDLER", event.payload);

  const { rows } = await client.query(`
    SELECT *
    FROM lesson_reschedule_projection
    WHERE lesson_id = $1
  `, [lesson_id]);

  if (!rows.length) return;

  const r = rows[0];

  // ✅ 1. Update reschedule status
   await client.query(`
    UPDATE lesson_reschedule_projection
    SET status = 'accepted',
      response_by = 'instructor',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE lesson_id = $1
  `, [event.identity_id]);

  // ✅ 2. Update schedule
  await client.query(`
    UPDATE lesson_schedule_projection
    SET start_time = $1,
        end_time = $2,
        updated_at = NOW()
    WHERE lesson_request_id = $3
  `, [
    r.proposed_start_time,
    r.proposed_end_time,
    lesson_id
  ]);

  // ✅ 3. Update student projection
  await client.query(`
    UPDATE student_active_lesson_projection
    SET start_time = $1,
        end_time = $2,
        updated_at = NOW()
    WHERE lesson_id = $3
  `, [
    r.proposed_start_time,
    r.proposed_end_time,
    lesson_id
  ]);

  console.log("✅ RESCHEDULE APPLIED:", lesson_id);
}


async function handleStudentCreated(client, event) {
  const payload = event.payload;

  await client.query(`
    INSERT INTO student_profile_projection (
      student_id,
      full_name,
      phone,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,NOW(),NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW()
  `, [
    event.identity_id,
    payload.full_name || null,
    payload.phone || null
  ]);
}



async function handleInstructorCreated(client, event) {
  const payload = event.payload;

  await client.query(`
    INSERT INTO instructor_profile_projection (
      instructor_id,
      full_name,
      phone,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,NOW(),NOW())
    ON CONFLICT (instructor_id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW()
  `, [
    event.identity_id,
    payload.full_name || null,
    payload.phone || null
  ]);
}
