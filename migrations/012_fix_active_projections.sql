-- ============================================
-- MIGRATION 012
-- Fix Active Lifecycle Projections (Latest Event Wins)
-- ============================================

BEGIN;

-- ============================================
-- FIX STUDENT ACTIVE PROJECTION
-- ============================================

CREATE OR REPLACE VIEW current_active_students AS
SELECT i.id
FROM identity i
JOIN LATERAL (
    SELECT e.event_type
    FROM event e
    WHERE e.identity_id = i.id
      AND e.event_type IN ('student_activated', 'student_deactivated')
    ORDER BY e.created_at DESC
    LIMIT 1
) latest ON TRUE
WHERE i.identity_type = 'student'
AND latest.event_type = 'student_activated';

-- ============================================
-- FIX INSTRUCTOR ACTIVE PROJECTION
-- ============================================

CREATE OR REPLACE VIEW current_active_instructors AS
SELECT i.id
FROM identity i
JOIN LATERAL (
    SELECT e.event_type
    FROM event e
    WHERE e.identity_id = i.id
      AND e.event_type IN ('instructor_activated', 'instructor_deactivated')
    ORDER BY e.created_at DESC
    LIMIT 1
) latest ON TRUE
WHERE i.identity_type = 'instructor'
AND latest.event_type = 'instructor_activated';

-- ============================================
-- FIX CAR ACTIVE PROJECTION
-- ============================================

CREATE OR REPLACE VIEW current_active_cars AS
SELECT i.id
FROM identity i
JOIN LATERAL (
    SELECT e.event_type
    FROM event e
    WHERE e.identity_id = i.id
      AND e.event_type IN ('car_activated')
    ORDER BY e.created_at DESC
    LIMIT 1
) latest ON TRUE
WHERE i.identity_type = 'car'
AND latest.event_type = 'car_activated';

-- ============================================
-- RECORD SCHEMA VERSION
-- ============================================

INSERT INTO schema_version(version, applied_at)
VALUES (12, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
