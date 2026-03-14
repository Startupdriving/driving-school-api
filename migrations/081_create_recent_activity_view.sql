CREATE OR REPLACE VIEW recent_activity_projection AS
SELECT
  e.id,
  e.identity_id,
  i.identity_type,
  e.event_type,
  e.instructor_id,
  e.car_id,
  e.created_at
FROM event e
LEFT JOIN identity i
ON i.id = e.identity_id
ORDER BY e.created_at DESC
LIMIT 100;
