-- ============================================
-- Rebuild instructor_current_zone projection
-- ============================================

BEGIN;

-- 1. Clear existing projection (safe because it's derived data)
TRUNCATE instructor_current_zone;

-- 2. Rebuild from event store (source of truth)
INSERT INTO instructor_current_zone (
  instructor_id,
  zone_id,
  lat,
  lng,
  updated_at
)
SELECT DISTINCT ON (e.identity_id)
  e.identity_id AS instructor_id,

  -- Ensure zone_id always present
  (e.payload->>'zone_id')::int AS zone_id,

  -- Optional fields
  (e.payload->>'lat')::numeric,
  (e.payload->>'lng')::numeric,

  e.created_at AS updated_at

FROM event e

WHERE e.event_type = 'instructor_location_updated'

ORDER BY
  e.identity_id,
  e.created_at DESC;

COMMIT;
