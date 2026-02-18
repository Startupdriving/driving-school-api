-- ============================================
-- MIGRATION 011
-- Lesson Projection + Proper Index Strategy
-- ============================================

BEGIN;

-- ============================================
-- 1️⃣ ADD REAL COLUMNS (NOT GENERATED)
-- ============================================

ALTER TABLE event
ADD COLUMN IF NOT EXISTS instructor_id uuid;

ALTER TABLE event
ADD COLUMN IF NOT EXISTS car_id uuid;

ALTER TABLE event
ADD COLUMN IF NOT EXISTS lesson_range tstzrange;

-- ============================================
-- 2️⃣ BACKFILL EXISTING LESSON EVENTS
-- ============================================

UPDATE event
SET instructor_id = (payload->>'instructor_id')::uuid,
    car_id        = (payload->>'car_id')::uuid,
    lesson_range  = tstzrange(
        (payload->>'start_time')::timestamptz,
        (payload->>'end_time')::timestamptz
    )
WHERE event_type = 'lesson_scheduled'
AND lesson_range IS NULL;

-- ============================================
-- 3️⃣ DROP OLD VIEWS SAFELY
-- ============================================

DROP VIEW IF EXISTS instructor_current_schedule CASCADE;
DROP VIEW IF EXISTS car_current_schedule CASCADE;
DROP VIEW IF EXISTS current_scheduled_lessons CASCADE;

-- ============================================
-- 4️⃣ RECREATE PROJECTIONS USING REAL COLUMNS
-- ============================================

CREATE VIEW current_scheduled_lessons AS
SELECT e.identity_id,
       (e.payload->>'student_id')::uuid AS student_id,
       e.instructor_id,
       e.car_id,
       lower(e.lesson_range) AS start_time,
       upper(e.lesson_range) AS end_time,
       e.created_at
FROM event e
WHERE e.event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
      AND e2.event_type IN ('lesson_canceled', 'lesson_completed')
);

CREATE VIEW instructor_current_schedule AS
SELECT instructor_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

CREATE VIEW car_current_schedule AS
SELECT car_id,
       start_time,
       end_time,
       identity_id AS lesson_id
FROM current_scheduled_lessons;

-- ============================================
-- 5️⃣ BASE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_identity_id
ON event(identity_id);

CREATE INDEX IF NOT EXISTS idx_event_identity_event_type
ON event(identity_id, event_type);

-- ============================================
-- 6️⃣ RANGE INDEXES (NOW SAFE)
-- ============================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS idx_event_instructor_range
ON event
USING GIST (instructor_id, lesson_range)
WHERE event_type = 'lesson_scheduled';

CREATE INDEX IF NOT EXISTS idx_event_car_range
ON event
USING GIST (car_id, lesson_range)
WHERE event_type = 'lesson_scheduled';

-- ============================================
-- 7️⃣ RECORD SCHEMA VERSION
-- ============================================

INSERT INTO schema_version(version, applied_at)
VALUES (11, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

