-- ============================================
-- 1. Ensure home_zone_id exists for instructors
-- ============================================

UPDATE identity
SET home_zone_id = 2
WHERE identity_type = 'instructor'
AND home_zone_id IS NULL;

-- ============================================
-- 2. Backfill instructor_location_updated events
-- ============================================

INSERT INTO event (id, identity_id, event_type, payload, created_at)
SELECT
  gen_random_uuid(),
  i.id,
  'instructor_location_updated',
  jsonb_build_object(
    'zone_id', COALESCE(i.home_zone_id, 2)
  ),
  NOW()
FROM identity i
WHERE i.identity_type = 'instructor'
AND NOT EXISTS (
  SELECT 1
  FROM event e
  WHERE e.identity_id = i.id
  AND e.event_type = 'instructor_location_updated'
);
