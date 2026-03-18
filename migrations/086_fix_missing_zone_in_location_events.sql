-- ============================================
-- Fix events missing zone_id using existing zone table
-- ============================================

UPDATE event
SET payload = jsonb_set(
  payload,
  '{zone_id}',
  to_jsonb(2)  -- TEMP default zone (or compute later)
)
WHERE event_type = 'instructor_location_updated'
AND (payload->>'zone_id') IS NULL;
