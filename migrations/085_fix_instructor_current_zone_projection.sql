-- ============================================
-- Rebuild instructor_current_zone projection
-- ============================================

TRUNCATE instructor_current_zone;

INSERT INTO instructor_current_zone (
  instructor_id,
  zone_id,
  lat,
  lng,
  updated_at
)
SELECT DISTINCT ON (e.identity_id)
  e.identity_id,
  (e.payload->>'zone_id')::int,
  (e.payload->>'lat')::float,
  (e.payload->>'lng')::float,
  e.created_at
FROM event e
WHERE e.event_type = 'instructor_location_updated'
ORDER BY e.identity_id, e.created_at DESC;
