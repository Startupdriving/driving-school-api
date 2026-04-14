CREATE OR REPLACE VIEW current_instructor_runtime_state AS
SELECT 
  s.id AS instructor_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM lesson_schedule_projection l
      WHERE l.instructor_id = s.id
        AND l.status IN ('confirmed', 'started')
    )
    THEN 'instructor_busy'
    ELSE 'instructor_online'
  END AS runtime_state
FROM current_active_instructors s;
