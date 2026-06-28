import { emitToStudent } from "./wsService.js";
import { ensureInstructorReliability, recalculateReliability } from "./reliabilityService.js";
import {  updateProjectionCheckpoint } from "./projectionCheckpointService.js";
import {
  processProjectionEvent
} from "./projectionPipelineService.js";
import * as packageProjectionBuilder
  from "./projections/packageProjectionBuilder.js";


console.log("EVENT HANDLER FILE LOADED");


export async function handleEvent(
  client,
  event,
  options = {}
) {

 console.log(
    "HANDLE EVENT ROUTER:",
    event.event_type,
    event.sequence_number
  );

  const { replay = false } = options;

  const { event_type } = event;

console.log("⚙️ HANDLING EVENT:", event_type);

  switch (event_type) {

case 'lesson_requested':
case 'lesson_request_wave_completed':
case 'instructor_online':
  break;

    case 'instructor_online':
      await handleInstructorOnline(client, event);
    break;

    case 'lesson_created':
      await handleLessonCreated(client, event, replay);
    break;


    case 'student_created':
      await handleStudentCreated(client, event);
    break;

    case 'instructor_created':
      await handleInstructorCreated(client, event);
    break;

    case "package_created":
   await packageProjectionBuilder.apply(
       client,
       event,
       replay
      );
    break;


case "package_updated":
  await packageProjectionBuilder.apply(
    client,
    event,
    replay
  );
break;

case "package_deactivated":
    await packageProjectionBuilder.apply(
    client,
    event,
    replay
  );
break;


case "enrollment_created":


  console.log(
    "ENROLLMENT CREATED CASE HIT",
    event.sequence_number
  );


  await handleEnrollmentCreated(
    client,
    event,
    replay
  );

break;


case "enrollment_cancelled":

  await handleEnrollmentCancelled(
    client,
    event,
    replay
  );

break;


case "enrollment_completed":

  await handleEnrollmentCompleted(
    client,
    event,
    replay
  );

break;

    case 'student_updated':
      await handleStudentUpdated(client, event);
    break;

    case 'instructor_updated':
      await handleInstructorUpdated(client, event);
    break;

    case 'lesson_confirmed':
     case 'lesson_request_dispatch_started':
    // intentionally ignored
    break;


    case "lesson_started":
      await handleLessonStarted(client, event, replay);
    break;

    case "lesson_completed":
      await handleLessonCompleted(client, event, replay);
    break;


    case "lesson_cancelled":
       await handleLessonCancelled(client, event, replay);
    break;


    case "lesson_scheduled":
      console.log("⏭ LEGACY EVENT: lesson_scheduled");
    return;

    case 'lesson_reschedule_accepted':
      await handleLessonRescheduleAccepted(client, event);
      break;

    case 'lesson_reschedule_requested':
      await handleLessonRescheduleRequested(client, event,  replay);
    break;

    case "lesson_rescheduled":
     await handleLessonRescheduled(
       client,
       event,
       replay
     );
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
       console.log(
  `⏭ SKIPPING EVENT: ${event_type}`
);

return;
  }
}



async function handleLessonCreated(client, event,
replay = false) {

  const payload = event.payload;

  const lessonRequestId =
    payload.lesson_request_id || event.identity_id;


    const seq =
      Number(event.sequence_number);
  // =====================================================
  // lesson_schedule_projection
  // =====================================================

 await processProjectionEvent({

    client,

    projectionName:
      "lesson_schedule_projection",

    event,

    replay,

    processor: async () => {


  await client.query(`
    INSERT INTO lesson_schedule_projection (
      lesson_id,
      lesson_request_id,
      instructor_id,
      student_id,
      start_time,
      end_time,
      status,
      created_at,
      updated_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      'confirmed',
      $7,
      $7
    )

    ON CONFLICT (lesson_id)

    DO UPDATE SET
      lesson_id = EXCLUDED.lesson_id,
      instructor_id = EXCLUDED.instructor_id,
      student_id = EXCLUDED.student_id,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = 'confirmed',
      updated_at = $7
  `, [
    event.identity_id,
    lessonRequestId,
    payload.instructor_id,
    payload.student_id,
    payload.start_time,
    payload.end_time,
    event.created_at
  ]);

  // =====================================================
  // student_active_lesson_projection
  // =====================================================


  await client.query(`
    INSERT INTO student_active_lesson_projection (
      student_id,
      lesson_request_id,
      lesson_id,
      instructor_id,
      start_time,
      end_time,
      status,
      confirmed_at,
      updated_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      'confirmed',
      $7,
      $7
    )

    ON CONFLICT (student_id)

    DO UPDATE SET
      lesson_request_id = EXCLUDED.lesson_request_id,
      lesson_id = EXCLUDED.lesson_id,
      instructor_id = EXCLUDED.instructor_id,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = 'confirmed',
      confirmed_at = $7,
      updated_at = $7
  `, [
    payload.student_id,
    lessonRequestId,
    event.identity_id,
    payload.instructor_id,
    payload.start_time,
    payload.end_time,
    event.created_at
  ]);

  // =====================================================
  // CHECKPOINTS
  // =====================================================

  await updateProjectionCheckpoint(
    client,
    "student_active_lesson_projection",
    Number(event.sequence_number)
  );
    }

  });

}



async function handleLessonCancelled(
  client,
  event,
  replay = false
) {

  const seq =
    Number(event.sequence_number);

 await processProjectionEvent({

    client,

    projectionName:
      "lesson_schedule_projection",

    event,

    replay,

    processor: async () => {

  // lesson lifecycle state
  await client.query(`
    UPDATE lesson_schedule_projection
    SET
      status = 'cancelled',
      updated_at = $1::timestamptz
    WHERE lesson_id = $2::uuid
  `, [event.created_at,
      event.identity_id]);

  // student dashboard state
  await client.query(`
      DELETE FROM student_active_lesson_projection
  WHERE lesson_id = $1::uuid
  `, [
    event.identity_id
  ]);

  console.log(
    "✅ LESSON CANCELLED:",
    event.identity_id
  );

  // expire pending reschedules
  await client.query(`
    UPDATE lesson_reschedule_projection
    SET
      status = 'expired',
      responded_at = $1::timestamptz
    WHERE lesson_id = $2::uuid
      AND status = 'pending'
  `, [
      event.created_at,
      event.identity_id]);

  // checkpoints LAST

  await updateProjectionCheckpoint(
    client,
    "student_active_lesson_projection",
    seq
  );

    await updateProjectionCheckpoint(
    client,
    "lesson_reschedule_projection",
    seq
  );

    }

  });

}


async function handleOfferAccepted(client, event) {
const seq =
    Number(event.sequence_number);

  await client.query(`
    UPDATE lesson_offer_negotiation_projection
    SET status = 'accepted',
    updated_at = $1::timestamptz
    WHERE offer_id = $2::uuid
  `, [
       event.created_at,
       event.identity_id]);

await updateProjectionCheckpoint(
  client,
  "lesson_offer_negotiation_projection",
  seq
);

}



async function handleOfferCountered(client, event) {
const seq =
    Number(event.sequence_number);  
const payload = event.payload;

  await client.query(`
    UPDATE lesson_offer_negotiation_projection
    SET
      proposed_start_time = $1::timestamptz,
      proposed_end_time = $2::timestamptz,
      proposed_price = $3::numeric,
      last_response_by = $4::text,
      response_count = response_count + 1,
      updated_at = $5::timestamptz
      WHERE offer_id = $6::uuid
  `, [
    payload.proposed_start_time,
    payload.proposed_end_time,
    payload.proposed_price,
    payload.actor,
    event.created_at,
    payload.offer_id
  ]);

await updateProjectionCheckpoint(
  client,
  "lesson_offer_negotiation_projection",
  seq
);

}


async function handleOfferSent(client, event) {
const seq =
    Number(event.sequence_number);
  
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
      $7,$7
    )
    ON CONFLICT (lesson_request_id, instructor_id)
    DO UPDATE SET
  updated_at = $7
  `, [
    payload.offer_id,
    payload.lesson_request_id,
    payload.instructor_id,
    request.student_id,
    request.requested_start_time,
    request.requested_end_time,
    event.created_at
  ]);

await updateProjectionCheckpoint(
  client,
  "lesson_offer_negotiation_projection",
  seq 
);

}

async function handleLessonRescheduleRequested(
  client,
  event,
  replay = false
) {

console.log(
  "RESCHEDULE REQUEST HANDLER START",
  event.sequence_number
);

  const seq =
    Number(event.sequence_number);

  const payload =
    event.payload;

let currentStartTime =
  payload.current_start_time;

let currentEndTime =
  payload.current_end_time;


// backward compatibility
// for older events

if (
  !currentStartTime ||
  !currentEndTime
) {

  const lessonRes =
    await client.query(`
      SELECT
        start_time,
        end_time
      FROM lesson_schedule_projection
      WHERE lesson_id = $1::uuid
      LIMIT 1
  `, [payload.lesson_id]);

  if (lessonRes.rowCount > 0) {

    currentStartTime =
      lessonRes.rows[0].start_time;

    currentEndTime =
      lessonRes.rows[0].end_time;

  }

}


await processProjectionEvent({

  client,

  projectionName:
    "lesson_reschedule_projection",

  event,

  replay,

  processor: async () => {

  await client.query(`
    INSERT INTO lesson_reschedule_projection (

      lesson_id,
      requested_by,
      requested_by_id,

      current_start_time,
      current_end_time,

      proposed_start_time,
      proposed_end_time,

      reason,
      status,
      created_at,
      updated_at

    )

    VALUES (

      $1,$2,$3,
      $4,$5,
      $6,$7,
      $8,

      'pending',

      $9,
      $9

    )

    ON CONFLICT (lesson_id)

    DO UPDATE SET

      requested_by =
        EXCLUDED.requested_by,

      requested_by_id =
        EXCLUDED.requested_by_id,

      current_start_time =
        EXCLUDED.current_start_time,

      current_end_time =
        EXCLUDED.current_end_time,

      proposed_start_time =
        EXCLUDED.proposed_start_time,

      proposed_end_time =
        EXCLUDED.proposed_end_time,

      reason =
        EXCLUDED.reason,

      status = 'pending',

      updated_at = $9

  `, [

    payload.lesson_id,
    payload.requested_by,
    payload.requested_by_id,

    // ✅ NOW FROM EVENT PAYLOAD
    currentStartTime,
    currentEndTime,

    payload.proposed_start_time,
    payload.proposed_end_time,

    payload.reason || null,

    event.created_at

  ]);

  console.log(
    "✅ RESCHEDULE REQUEST STORED:",
    payload.lesson_id
  );

  await updateProjectionCheckpoint(
    client,
    "lesson_reschedule_projection",
    seq
  );

}

});
}


async function handleLessonRescheduleAccepted(client, event) {

  const {
    lesson_id,
    accepted_by
  } = event.payload;

  console.log(
    "🔥 ENTER RESCHEDULE HANDLER",
    event.payload
  );

  const { rows } = await client.query(`
    SELECT *
    FROM lesson_reschedule_projection
    WHERE lesson_id = $1::uuid
    LIMIT 1
  `, [lesson_id]);

  if (!rows.length) {
    return;
  }

  const r = rows[0];

  // =====================================================
  // RESCHEDULE PROJECTION
  // =====================================================

  await client.query(`
    UPDATE lesson_reschedule_projection
    SET
      status = 'accepted',
      response_by = $1::text,
      responded_at = $2::timestamptz,
      updated_at = $3::timestamptz
    WHERE lesson_id = $4::uuid
  `, [
    accepted_by || null,
    event.created_at,
    event.created_at,
    lesson_id
  ]);

  // =====================================================
  // LESSON SCHEDULE
  // =====================================================

  await client.query(`
    UPDATE lesson_schedule_projection
    SET
      start_time = $1::timestamptz,
      end_time = $2::timestamptz,
      updated_at = $3::timestamptz
    WHERE lesson_id = $4::uuid
  `, [
    r.proposed_start_time,
    r.proposed_end_time,
    event.created_at,
    lesson_id
  ]);

  // =====================================================
  // STUDENT ACTIVE LESSON
  // =====================================================

  await client.query(`
    UPDATE student_active_lesson_projection
    SET
      start_time = $1::timestamptz,
      end_time = $2::timestamptz,
      updated_at = $3::timestamptz
    WHERE lesson_id = $4::uuid
  `, [
    r.proposed_start_time,
    r.proposed_end_time,
    event.created_at,
    lesson_id
  ]);

  console.log(
    "✅ RESCHEDULE APPLIED:",
    lesson_id
  );

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
    VALUES ($1,$2,$3,$4,$4)
    ON CONFLICT (student_id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = $4
  `, [
    event.identity_id,
    payload.full_name || null,
    payload.phone || null,
    event.created_at
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
    VALUES ($1,$2,$3,$4,$4)
    ON CONFLICT (instructor_id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = $4
  `, [
    event.identity_id,
    payload.full_name || null,
    payload.phone || null,
    event.created_at
  ]);
}


async function handleStudentUpdated(client, event) {
  const payload = event.payload;

  await client.query(`
    UPDATE student_profile_projection
    SET
      full_name = COALESCE($1, full_name),
      phone = COALESCE($2, phone),
      updated_at = $3::timestamptz
    WHERE student_id = $4::uuid
  `, [
    payload.full_name || null,
    payload.phone || null,
    event.created_at,
    event.identity_id
  ]);
}



async function handleInstructorUpdated(client, event) {
  const payload = event.payload;

  await client.query(`
    UPDATE instructor_profile_projection
    SET
      full_name = COALESCE($1, full_name),
      phone = COALESCE($2, phone),
      updated_at = $3::timestamptz
    WHERE instructor_id = $4::uuid
  `, [
    payload.full_name || null,
    payload.phone || null,
    event.created_at,
    event.identity_id
  ]);
}


async function handleLessonStarted(
  client,
  event,
  replay = false
) {
const seq = Number(event.sequence_number);


await processProjectionEvent({

    client,

    projectionName:
      "lesson_schedule_projection",

    event,

    replay,

    processor: async () => {


await client.query(`
    UPDATE lesson_schedule_projection
    SET
      status = 'started',
      updated_at = $1::timestamptz
    WHERE lesson_id = $2::uuid
  `, [event.created_at,
      event.identity_id]);

  const lessonRes =
    await client.query(`
      SELECT student_id
      FROM lesson_schedule_projection
      WHERE lesson_id = $1::uuid
      LIMIT 1
    `, [event.identity_id]);

  const studentId =
    lessonRes.rows[0]?.student_id;

  if (studentId) {

    await client.query(`
  UPDATE student_active_lesson_projection
  SET
    status = 'started',
    started_at = $1::timestamptz,
    completed_at = NULL,
    cancelled_at = NULL,
    updated_at = $1::timestamptz
  WHERE lesson_id = $2::uuid
`, [
  event.created_at,
  event.identity_id
]);

  }

    }

  });

  console.log(
    "✅ LESSON STARTED:",
    event.identity_id
  );



await updateProjectionCheckpoint(
  client,
  "student_active_lesson_projection",
  Number(event.sequence_number)
);


}


async function handleLessonCompleted(
  client,
  event,
  replay = false
) {

const seq =
  Number(event.sequence_number);

await processProjectionEvent({

  client,

  projectionName:
    "lesson_schedule_projection",

  event,

  replay,

  processor: async () => {


  await client.query(`
    UPDATE lesson_schedule_projection
    SET
      status = 'completed',
      updated_at = $1::timestamptz
    WHERE lesson_id = $2::uuid
  `, [event.created_at,
      event.identity_id]);

  await client.query(`
      DELETE FROM student_active_lesson_projection
      WHERE lesson_id = $1::uuid
  `, [
    event.identity_id
  ]);

  console.log(
    "✅ LESSON COMPLETED:",
    event.identity_id
  );

await client.query(`
  UPDATE lesson_reschedule_projection
  SET
    status = 'expired',
    responded_at = $1::timestamptz
  WHERE lesson_id = $2::uuid
    AND status = 'pending'
`, [
     event.created_at,
     event.identity_id
   ]);

await updateProjectionCheckpoint(
  client,
  "student_active_lesson_projection",
  seq
);

await updateProjectionCheckpoint(
  client,
  "lesson_reschedule_projection",
  seq
);

    }

  });

}


async function handleLessonRescheduled(
  client,
  event,
  replay = false
) {

  const seq =
  Number(event.sequence_number);

  const payload =
    event.payload;


await processProjectionEvent({

  client,

  projectionName:
    "lesson_schedule_projection",

  event,

  replay,

  processor: async () => {
  // update lesson schedule
  await client.query(`
    UPDATE lesson_schedule_projection
    SET
      start_time = $1,
      end_time = $2,
      updated_at = $3::timestamptz
    WHERE lesson_id = $4::uuid
  `, [
    payload.new_start_time,
    payload.new_end_time,
    event.created_at,
    payload.lesson_id
  ]);

  // update student dashboard state
  await client.query(`
    UPDATE student_active_lesson_projection
    SET
      start_time = $1,
      end_time = $2,
      updated_at = $3::timestamptz
    WHERE lesson_id = $4::uuid
  `, [
    payload.new_start_time,
    payload.new_end_time,
    event.created_at,
    payload.lesson_id
  ]);


  // reschedule projection checkpoint

  await updateProjectionCheckpoint(
    client,
    "student_active_lesson_projection",
    seq
  );


    }

  });

await processProjectionEvent({

  client,

  projectionName:
    "lesson_reschedule_projection",

  event,

  replay,

  processor: async () => {

    console.log(
      "RESCHEDULE ACCEPT PROCESSOR",
      event.sequence_number
    );

    await client.query(`
      UPDATE lesson_reschedule_projection
      SET
        status = 'accepted',
        response_by = $1,
        responded_at = $2,
        updated_at = $2
      WHERE lesson_id = $3::uuid
    `, [
      payload.accepted_by,
      event.created_at,
      payload.lesson_id
    ]);

  }

});


}



async function handleInstructorOnline(
  client,
  event
) {

  const seq =
    Number(event.sequence_number);

  const instructorId =
    event.identity_id;

  await client.query(`

    INSERT INTO instructor_runtime_state_projection (

      instructor_id,
      runtime_state,
      updated_at

    )

    VALUES (

      $1,
      'instructor_online',
      $2

    )

    ON CONFLICT (instructor_id)

    DO UPDATE SET

      runtime_state =
        'instructor_online',

      updated_at =
        EXCLUDED.updated_at

  `, [

    instructorId,
    event.created_at

  ]);

  await updateProjectionCheckpoint(
    client,
    "instructor_runtime_state_projection",
    seq
  );

}



async function handlePackageCreated(
  client,
  event,
  replay = false
) {

  console.log(
    "PACKAGE HANDLER RUNNING",
    event.identity_id
  );

  const seq =
    Number(event.sequence_number);

  const payload =
    event.payload;

  await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {

  const result =  await client.query(`

        INSERT INTO package_projection (

          package_id,

          name,

          lesson_count,

          lesson_duration_minutes,

          base_price,

          service_mode,

          is_active,

          created_at,

          updated_at

        )

        VALUES (

          $1,
          $2,
          $3,
          $4,
          $5,
          $6,

          TRUE,

          $7,
          $7

        )

        ON CONFLICT (package_id)

        DO NOTHING

      `, [

        event.identity_id,

        payload.name,

        payload.lesson_count,

        payload.lesson_duration_minutes,

        payload.base_price,

        payload.service_mode,

        event.created_at

      ]);

    }

  });

}



async function handlePackageUpdated(
  client,
  event,
  replay = false
) {


console.log(
  "PACKAGE UPDATED HANDLER START",
  event.sequence_number
);


  const payload =
    event.payload;


  await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {

  console.log(
    "PACKAGE UPDATED PROCESSOR RUNNING"
  );

      await client.query(`

        UPDATE package_projection

        SET

          name = $2,

          lesson_count = $3,

          lesson_duration_minutes = $4,

          base_price = $5,

          service_mode = $6,

          updated_at = $7

        WHERE package_id = $1

      `, [

        event.identity_id,

        payload.name,

        payload.lesson_count,

        payload.lesson_duration_minutes,

        payload.base_price,

        payload.service_mode,

        event.created_at

      ]);

 console.log(
    "PACKAGE UPDATED SQL COMPLETE"
  );

    }

  });


console.log(
  "PACKAGE UPDATED PIPELINE FINISHED",
  event.sequence_number
);

}



async function handlePackageDeactivated(
  client,
  event,
  replay = false
) {

  await processProjectionEvent({

    client,

    projectionName:
      "package_projection",

    event,

    replay,

    processor: async () => {

      await client.query(`

        UPDATE package_projection

        SET

          is_active = FALSE,

          updated_at = $2

        WHERE package_id = $1

      `, [

        event.identity_id,

        event.created_at

      ]);

    }

  });

}



async function handleEnrollmentCreated(
  client,
  event,
  replay = false
) {

  console.log(
    "ENROLLMENT CREATED HANDLER START",
    event.sequence_number
  );

  const payload =
    event.payload;

  console.log(
    "ENROLLMENT CREATED ABOUT TO CALL PIPELINE",
    event.sequence_number
  );

  await processProjectionEvent({

    client,

    projectionName:
      "enrollment_projection",

    event,

    replay,

    processor: async () => {

      console.log(
        "ENROLLMENT CREATED PROCESSOR RUNNING"
      );

      await client.query(`

        INSERT INTO enrollment_projection (

          enrollment_id,

          student_id,

          package_id,

          status,

          created_at,

          updated_at

        )

        VALUES (

          $1,
          $2,
          $3,

          'ACTIVE',

          $4,
          $4

        )

      `, [

        event.identity_id,

        payload.student_id,

        payload.package_id,

        event.created_at

      ]);

      console.log(
        "ENROLLMENT CREATED SQL COMPLETE"
      );

    }

  });

  console.log(
    "ENROLLMENT CREATED PIPELINE FINISHED",
    event.sequence_number
  );

}



async function handleEnrollmentCancelled(
  client,
  event,
  replay = false
) {
console.log(
  "ENROLLMENT CANCELLED HANDLER START",
  event.sequence_number
);
}



async function handleEnrollmentCompleted(
  client,
  event,
  replay = false
) {
console.log(
  "ENROLLMENT COMPLETED HANDLER START",
  event.sequence_number
);
}
