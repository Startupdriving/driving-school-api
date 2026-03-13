CREATE OR REPLACE VIEW instructor_active_lesson_projection AS
SELECT
  e.instructor_id,
  e.identity_id AS lesson_id,
  MAX(e.created_at) FILTER (
    WHERE e.event_type = 'lesson_started'
  ) AS started_at
FROM event e
WHERE e.event_type IN (
  'lesson_started',
  'lesson_completed'
)
GROUP BY e.instructor_id, e.identity_id
HAVING
  bool_or(e.event_type = 'lesson_started')
  AND NOT bool_or(e.event_type = 'lesson_completed');
