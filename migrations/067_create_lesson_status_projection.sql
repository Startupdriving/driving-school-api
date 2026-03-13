-- 067_create_lesson_status_projection.sql

CREATE OR REPLACE VIEW lesson_status_projection AS
SELECT
  identity_id AS lesson_id,

  CASE
    WHEN bool_or(event_type = 'lesson_completed') THEN 'completed'
    WHEN bool_or(event_type = 'lesson_started') THEN 'started'
    WHEN bool_or(event_type = 'lesson_created') THEN 'created'
    ELSE 'unknown'
  END AS lesson_status,

  MAX(created_at) FILTER (
    WHERE event_type = 'lesson_started'
  ) AS started_at,

  MAX(created_at) FILTER (
    WHERE event_type = 'lesson_completed'
  ) AS completed_at

FROM event
WHERE event_type IN (
  'lesson_created',
  'lesson_started',
  'lesson_completed'
)
GROUP BY identity_id;
