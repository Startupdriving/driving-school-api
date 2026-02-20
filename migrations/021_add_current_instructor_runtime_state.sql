-- ============================================
-- MIGRATION 021
-- Instructor Runtime State Projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_instructor_runtime_state AS
SELECT
  s.instructor_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM current_active_lessons l
      WHERE l.instructor_id = s.instructor_id
    )
    THEN 'instructor_busy'
    ELSE s.state
  END AS runtime_state
FROM current_instructor_state s;

COMMIT;
