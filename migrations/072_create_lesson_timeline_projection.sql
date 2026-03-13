CREATE OR REPLACE VIEW lesson_timeline_projection AS
SELECT
  e.identity_id AS lesson_request_id,

  MAX(
    CASE WHEN e.event_type = 'lesson_requested'
    THEN e.created_at END
  ) AS requested_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_request_dispatch_started'
    THEN e.created_at END
  ) AS dispatch_started_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_offer_accepted'
    THEN e.created_at END
  ) AS offer_accepted_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_confirmed'
    THEN e.created_at END
  ) AS confirmed_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_started'
    THEN e.created_at END
  ) AS started_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_completed'
    THEN e.created_at END
  ) AS completed_at,

  MAX(
    CASE WHEN e.event_type = 'lesson_offer_accepted'
    THEN e.instructor_id::text END
  )::uuid AS instructor_id

FROM event e

WHERE e.event_type IN (
  'lesson_requested',
  'lesson_request_dispatch_started',
  'lesson_offer_accepted',
  'lesson_confirmed',
  'lesson_started',
  'lesson_completed'
)

GROUP BY e.identity_id;
