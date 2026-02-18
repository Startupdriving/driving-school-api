-- ============================================
-- MIGRATION 011
-- Lesson Projection + Index Hardening
-- (Generated Columns + Range Optimization)
-- ============================================

BEGIN;

-- ============================================
-- 1️⃣ ADD GENERATED COLUMNS (FAIL FAST)
-- ============================================

ALTER TABLE event
ADD COLUMN instructor_id_uuid uuid
GENERATED ALWAYS AS (
    CASE
        WHEN event_type = 'lesson_scheduled'
        THEN (payload->>'instructor_id')::uuid
        ELSE NULL
    END
) STORED;

ALTER TABLE event
ADD COLUMN car_id_uuid uuid
GENERATED ALWAYS AS (
    CASE
        WHEN event_type = 'lesson_scheduled'
        THEN (payload->>'car_id')::uuid
        ELSE NULL
    END
) STORED;

ALTER TABLE event
ADD COLUMN lesson_range tstzrange
GENERATED ALWAYS AS (
    CASE
        WHEN event_type = 'lesson_scheduled'
        THEN tstzrange(
            (payload->>'start_time')::timestamptz,
            (payload->>'end_time')::timestamptz
        )
        ELSE NULL
    END
) STORED;

-- ============================================
-- 2️⃣ CURRENT SCHEDULED LESSONS VIEW
-- ============================================

CREATE OR REPLACE VIEW current_scheduled_lessons AS
SELECT e.identity_id,
       (e.payload->>'student_id')::uuid  AS student_id,
       e.instructor_id_uuid             AS instructor_id,
       e.car_id_uuid                    AS car_id,
       lower(e.lesson_range)            AS start_time,
       upper(e.lesson_range)            AS end_time,
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
-- 3️⃣ INSTRUCTOR CURRENT SCHEDULE VIEW
-- ============================================

CREATE OR REPLACE VIEW instructor_current_schedule AS
SELECT instructor_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

-- ============================================
-- 4️⃣ CAR CURRENT SCHEDULE VIEW
-- ============================================

CREATE OR REPLACE VIEW car_current_schedule AS
SELECT car_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

-- ============================================
-- 5️⃣ BASE EVENT INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_identity_id
ON event(identity_id);

CREATE INDEX IF NOT EXISTS idx_event_identity_event_type
ON event(identity_id, event_type);

-- ============================================
-- 6️⃣ RANGE INDEXES (GIST + GENERATED COLUMNS)
-- ============================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS idx_event_instructor_range
ON event
USING GIST (instructor_id_uuid, lesson_range)
WHERE event_type = 'lesson_scheduled';

CREATE INDEX IF NOT EXISTS idx_event_car_range
ON event
USING GIST (car_id_uuid, lesson_range)
WHERE event_type = 'lesson_scheduled';

-- ============================================
-- 7️⃣ RECORD SCHEMA VERSION
-- ============================================

INSERT INTO schema_version(version, applied_at)
VALUES (11, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

