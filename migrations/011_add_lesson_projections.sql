-- ============================================
-- MIGRATION 011
-- Lesson Projection + Index Hardening
-- ============================================

BEGIN;

-- ============================================
-- DROP VIEWS IF THEY EXIST (to avoid column rename conflict)
-- ============================================

DROP VIEW IF EXISTS instructor_current_schedule CASCADE;
DROP VIEW IF EXISTS car_current_schedule CASCADE;
DROP VIEW IF EXISTS current_scheduled_lessons CASCADE;

-- ============================================
-- 1️⃣ CURRENT SCHEDULED LESSONS VIEW
-- ============================================

CREATE VIEW current_scheduled_lessons AS
SELECT e.identity_id,
       (e.payload->>'student_id')::uuid      AS student_id,
       (e.payload->>'instructor_id')::uuid   AS instructor_id,
       (e.payload->>'car_id')::uuid          AS car_id,
       (e.payload->>'start_time')::timestamp AS start_time,
       (e.payload->>'end_time')::timestamp   AS end_time,
       e.created_at
FROM event e
WHERE e.event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
      AND e2.event_type IN ('lesson_canceled', 'lesson_completed')
);

-- ============================================
-- 2️⃣ INSTRUCTOR CURRENT SCHEDULE VIEW
-- ============================================

CREATE VIEW instructor_current_schedule AS
SELECT instructor_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

-- ============================================
-- 3️⃣ CAR CURRENT SCHEDULE VIEW
-- ============================================

CREATE VIEW car_current_schedule AS
SELECT car_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

-- ============================================
-- 4️⃣ BASE EVENT ACCELERATION INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_identity_id
ON event(identity_id);

CREATE INDEX IF NOT EXISTS idx_event_identity_event_type
ON event(identity_id, event_type);

-- ============================================
-- 5️⃣ RANGE-OPTIMIZED SCHEDULING INDEXES
-- ============================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS idx_event_instructor_range
ON event
USING GIST (
    ((payload->>'instructor_id')::uuid),
    tsrange(
        (payload->>'start_time')::timestamp,
        (payload->>'end_time')::timestamp
    )
)
WHERE event_type = 'lesson_scheduled';

CREATE INDEX IF NOT EXISTS idx_event_car_range
ON event
USING GIST (
    ((payload->>'car_id')::uuid),
    tsrange(
        (payload->>'start_time')::timestamp,
        (payload->>'end_time')::timestamp
    )
)
WHERE event_type = 'lesson_scheduled';

-- ============================================
-- RECORD SCHEMA VERSION
-- ============================================

INSERT INTO schema_version(version, applied_at)
VALUES (11, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

