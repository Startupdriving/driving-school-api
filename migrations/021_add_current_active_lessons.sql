-- ============================================
-- MIGRATION 020
-- Current Active Lessons Projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_active_lessons AS
SELECT *
FROM current_scheduled_lessons
WHERE NOW() <@ tstzrange(start_time, end_time);

COMMIT;
