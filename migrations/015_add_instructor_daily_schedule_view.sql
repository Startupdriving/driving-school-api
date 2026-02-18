-- ============================================
-- MIGRATION 015
-- Instructor Daily Schedule Projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW instructor_daily_schedule AS
SELECT
    identity_id AS lesson_id,
    instructor_id,
    ((payload ->> 'student_id'))::uuid AS student_id,
    car_id,
    lower(lesson_range) AS start_time,
    upper(lesson_range) AS end_time,
    DATE(lower(lesson_range)) AS lesson_date
FROM event e
WHERE event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
    AND e2.event_type IN ('lesson_cancelled', 'lesson_completed')
);

INSERT INTO schema_version(version, applied_at)
VALUES (15, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
