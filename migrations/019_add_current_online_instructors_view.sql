-- ============================================
-- MIGRATION 019
-- Current Online Instructors Projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_online_instructors AS
SELECT s.instructor_id
FROM current_instructor_state s
JOIN current_active_instructors a
  ON a.id = s.instructor_id
WHERE s.state = 'instructor_online';

COMMIT;
