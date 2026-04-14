export async function handleEvent(client, event) {
  const { event_type } = event;

console.log("⚙️ HANDLING EVENT:", event_type);

  switch (event_type) {

    case 'lesson_scheduled':
      await handleLessonScheduled(client, event);
      break;

    case 'lesson_cancelled':
      await handleLessonCancelled(client, event);
      break;

    case 'lesson_offer_countered':
      await handleOfferCountered(client, event);
      break;

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
    DO NOTHING
  `, [
    payload.offer_id,
    payload.lesson_request_id,
    payload.instructor_id,
    request.student_id,
    request.requested_start_time,
    request.requested_end_time
  ]);
}
