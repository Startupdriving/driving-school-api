BEGIN;

-- ============================================
-- Step 1: Add constraint WITHOUT validating old data
-- ============================================

ALTER TABLE event
ADD CONSTRAINT location_event_must_have_zone
CHECK (
  event_type != 'instructor_location_updated'
  OR payload ? 'zone_id'
)
NOT VALID;

-- ============================================
-- Step 2: Validate constraint (fails if bad data exists)
-- ============================================

ALTER TABLE event
VALIDATE CONSTRAINT location_event_must_have_zone;

COMMIT;
