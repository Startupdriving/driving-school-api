CREATE OR REPLACE VIEW student_upcoming_lessons_projection AS
SELECT
  (e.payload->>'student_id')::uuid AS student_id,
  e.identity_id AS lesson_request_id,

  MAX(
    CASE
      WHEN e.event_type = 'lesson_offer_accepted'
      THEN e.instructor_id::text
      ELSE NULL
    END
  )::uuid AS instructor_id,

  LOWER(e.lesson_range) AS start_time

FROM event e

WHERE e.event_type IN (
  'lesson_requested',
  'lesson_offer_accepted',
  'lesson_request_expired',
  'lesson_confirmed'
)

GROUP BY
  e.identity_id,
  (e.payload->>'student_id'),
  LOWER(e.lesson_range)

HAVING
  bool_or(e.event_type = 'lesson_confirmed')
  AND NOT bool_or(e.event_type = 'lesson_request_expired')
  AND LOWER(e.lesson_range) > NOW();CREATE OR REPLACE VIEW student_upcoming_lessons_projection AS
SELECT
  (e.payload->>'student_id')::uuid AS student_id,
  e.identity_id AS lesson_request_id,

  MAX(
    CASE
      WHEN e.event_type = 'lesson_offer_accepted'
      THEN e.instructor_id::text
      ELSE NULL
    END
  )::uuid AS instructor_id,

  LOWER(e.lesson_range) AS start_time

FROM event e

WHERE e.event_type IN (
  'lesson_requested',
  'lesson_offer_accepted',
  'lesson_request_expired',
  'lesson_confirmed'
)

GROUP BY
  e.identity_id,
  (e.payload->>'student_id'),
  LOWER(e.lesson_range)

HAVING
  bool_or(e.event_type = 'lesson_confirmed')
  AND NOT bool_or(e.event_type = 'lesson_request_expired')
  AND LOWER(e.lesson_range) > NOW();
