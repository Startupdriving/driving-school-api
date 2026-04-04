DROP VIEW IF EXISTS lesson_timeline_projection CASCADE;

CREATE VIEW lesson_timeline_projection AS
WITH request_events AS (
  SELECT
    e.identity_id AS lesson_request_id,

    MAX(CASE WHEN e.event_type = 'lesson_requested' THEN e.created_at END) AS requested_at,
    MAX(CASE WHEN e.event_type = 'lesson_request_dispatch_started' THEN e.created_at END) AS dispatch_started_at,
    MAX(CASE WHEN e.event_type = 'lesson_offer_accepted' THEN e.created_at END) AS offer_accepted_at,
    MAX(CASE WHEN e.event_type = 'lesson_confirmed' THEN e.created_at END) AS confirmed_at,
    MAX(CASE WHEN e.event_type = 'lesson_started' THEN e.created_at END) AS started_at,
    MAX(CASE WHEN e.event_type = 'lesson_completed' THEN e.created_at END) AS completed_at,

    MAX(
      CASE 
        WHEN e.event_type = 'lesson_offer_accepted'
        THEN e.instructor_id::text
      END
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
  GROUP BY e.identity_id
),  -- ✅ IMPORTANT COMMA HERE

lesson_map AS (
  SELECT
    (payload->>'lesson_request_id')::uuid AS lesson_request_id,
    identity_id AS lesson_id
  FROM event
  WHERE event_type = 'lesson_created'
),  -- ✅ IMPORTANT COMMA HERE

lesson_cancel AS (
  SELECT
    identity_id AS lesson_id,
    MAX(created_at) AS cancelled_at
  FROM event
  WHERE event_type = 'lesson_cancelled'
  GROUP BY identity_id
)

SELECT
  r.lesson_request_id,
  r.requested_at,
  r.dispatch_started_at,
  r.offer_accepted_at,
  r.confirmed_at,
  r.started_at,
  r.completed_at,
  lc.cancelled_at,
  r.instructor_id

FROM request_events r
LEFT JOIN lesson_map lm
  ON lm.lesson_request_id = r.lesson_request_id
LEFT JOIN lesson_cancel lc
  ON lc.lesson_id = lm.lesson_id;
