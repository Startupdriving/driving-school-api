-- ============================================
-- MIGRATION 014
-- Fix lesson_cancelled spelling in projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_scheduled_lessons AS
SELECT identity_id,
       ((payload ->> 'student_id'))::uuid AS student_id,
       instructor_id,
       car_id,
       lower(lesson_range) AS start_time,
       upper(lesson_range) AS end_time,
       created_at
FROM event e
WHERE event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
    AND e2.event_type IN ('lesson_cancelled', 'lesson_completed')
);

INSERT INTO schema_version(version, applied_at)
VALUES (14, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
