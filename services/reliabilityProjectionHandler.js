import {
  ensureInstructorReliability,
  recalculateReliability
} from "./reliabilityService.js";

import {
  processProjectionEvent
} from "./projectionPipelineService.js";



export async function handleReliabilityProjection(
  client,
  event,
  options = {}
)
 {
   const { replay = false } =
  options;

  const seq =
    Number(event.sequence_number);

  switch (event.event_type) {

    case "lesson_completed":
      await handleLessonCompletedReliability(
        client,
        event,
        replay
      );
    break;

    case "lesson_cancelled":
      await handleLessonCancelledReliability(
        client,
        event,
        replay
      );
    break;

    case "lesson_reschedule_requested":
      await handleRescheduleRequestedReliability(
        client,
        event,
        replay
      );
    break;

    case "lesson_reschedule_rejected":
      await handleRescheduleRejectedReliability(
        client,
        event,
        replay
      );
    break;

    case "lesson_rescheduled":
      await handleRescheduledReliability(
        client,
        event,
        replay
      );
    break;

    default:
      return;
  }

}



async function handleLessonCompletedReliability(
  client,
  event,
  replay = false
) {

  const lessonRes =
    await client.query(`
      SELECT instructor_id
      FROM lesson_schedule_projection
      WHERE lesson_id = $1
      LIMIT 1
  `, [event.identity_id]);

  const instructorId =
    lessonRes.rows[0]?.instructor_id;

  if (!instructorId) {
    return;
  }

  await processProjectionEvent({

    client,

    projectionName:
      "instructor_reliability_projection",

    event,

    replay,

    processor: async () => {

      await ensureInstructorReliability(
        client,
        instructorId
      );

      await client.query(`
        UPDATE instructor_reliability_projection
        SET
          completed_lessons =
            completed_lessons + 1,
          completed_after_start =
            completed_after_start + 1,
          updated_at = $2
        WHERE instructor_id = $1
      `, [
        instructorId,
        event.created_at
      ]);

      await recalculateReliability(
        client,
        instructorId
      );

    }

  });

}



async function handleLessonCancelledReliability(
  client,
  event,
  replay = false
) {

  const payload =
    event.payload;

  // only instructor cancellations

  if (
    payload.cancelled_by !==
    "instructor"
  ) {
    return;
  }

  const instructorId =
    payload.cancelled_by_id;

  if (!instructorId) {
    return;
  }

  await processProjectionEvent({

    client,

    projectionName:
      "instructor_reliability_projection",

    event,

    replay,

    processor: async () => {

      await ensureInstructorReliability(
        client,
        instructorId
      );

      await client.query(`
        UPDATE instructor_reliability_projection
        SET
          cancelled_lessons =
            cancelled_lessons + 1,

          updated_at = $2

        WHERE instructor_id = $1
      `, [
        instructorId,
        event.created_at
      ]);

      await recalculateReliability(
        client,
        instructorId
      );

    }

  });

}




async function handleRescheduledReliability(
  client,
  event,
  replay = false
) {

  const lessonRes =
    await client.query(`
      SELECT instructor_id
      FROM lesson_schedule_projection
      WHERE lesson_id = $1
      LIMIT 1
  `, [event.identity_id]);

  const instructorId =
    lessonRes.rows[0]?.instructor_id;

  if (!instructorId) {
    return;
  }

  await processProjectionEvent({

    client,

    projectionName:
      "instructor_reliability_projection",

    event,

    replay,

    processor: async () => {

      await ensureInstructorReliability(
        client,
        instructorId
      );

      await client.query(`
        UPDATE instructor_reliability_projection
        SET
          reschedules_accepted =
            reschedules_accepted + 1,

          updated_at = $2

        WHERE instructor_id = $1
      `, [
        instructorId,
        event.created_at
      ]);

      await recalculateReliability(
        client,
        instructorId
      );

    }

  });

}


async function handleRescheduleRejectedReliability(
  client,
  event,
  replay = false
) {

  const lessonRes =
    await client.query(`
      SELECT instructor_id
      FROM lesson_schedule_projection
      WHERE lesson_id = $1
      LIMIT 1
  `, [event.identity_id]);

  const instructorId =
    lessonRes.rows[0]?.instructor_id;

  const reqRes =
    await client.query(`
      SELECT requested_by
      FROM lesson_reschedule_projection
      WHERE lesson_id = $1
      LIMIT 1
  `, [event.identity_id]);

  const requestedBy =
    reqRes.rows[0]?.requested_by;

  // only penalize if instructor
  // initiated reschedule

  if (
    instructorId &&
    requestedBy === "instructor"
  ) {

    await processProjectionEvent({

      client,

      projectionName:
        "instructor_reliability_projection",

      event,

      replay,

      processor: async () => {

        await ensureInstructorReliability(
          client,
          instructorId
        );

        await client.query(`
          UPDATE instructor_reliability_projection
          SET
            reschedules_rejected =
              reschedules_rejected + 1,

            updated_at = $2

          WHERE instructor_id = $1
        `, [
          instructorId,
          event.created_at
        ]);

        await recalculateReliability(
          client,
          instructorId
        );

      }

    });

  }

  console.log(
    "❌ RESCHEDULE REJECTED:",
    event.identity_id
  );

}


async function handleRescheduleRequestedReliability(
  client,
  event,
  replay = false
) {

  const payload =
    event.payload;

  // only instructor-initiated
  // reschedules affect reliability

  if (
    payload.requested_by !==
    "instructor"
  ) {
    return;
  }

  const instructorId =
    payload.requested_by_id;

  if (!instructorId) {
    return;
  }

  await processProjectionEvent({

    client,

    projectionName:
      "instructor_reliability_projection",

    event,

    replay,

    processor: async () => {

      await ensureInstructorReliability(
        client,
        instructorId
      );

      await client.query(`
        UPDATE instructor_reliability_projection
        SET
          reschedules_requested =
            reschedules_requested + 1,

          updated_at = $2

        WHERE instructor_id = $1
      `, [
        instructorId,
        event.created_at
      ]);

      await recalculateReliability(
        client,
        instructorId
      );

      console.log(
        "📊 RESCHEDULE REQUEST COUNT:",
        instructorId
      );

    }

  });

}
