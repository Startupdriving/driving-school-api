CREATE OR REPLACE VIEW current_instructor_location AS
SELECT DISTINCT ON (identity_id)
  identity_id AS instructor_id,
  ST_SetSRID(
    ST_MakePoint(
      (payload->>'lng')::float,
      (payload->>'lat')::float
    ),
    4326
  ) AS location
FROM event
WHERE event_type = 'instructor_location_updated'
ORDER BY identity_id, created_at DESC;
