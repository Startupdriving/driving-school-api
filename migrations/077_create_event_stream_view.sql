CREATE OR REPLACE VIEW event_stream_view AS
SELECT
  e.id,
  e.identity_id,
  i.identity_type,
  e.event_type,
  e.instructor_id,
  e.car_id,
  e.payload,
  e.created_at
FROM event e
JOIN identity i
ON i.id = e.identity_id;
