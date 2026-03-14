CREATE OR REPLACE VIEW dispatch_observability_projection AS
SELECT
  e.identity_id AS lesson_request_id,
  e.instructor_id,
  (e.payload->>'wave')::int AS wave,

  e.created_at AS offer_created_at,

  icz.zone_id AS instructor_zone,
  req_zone.zone_id AS request_zone,

  s.economic_score,
  s.offers_last_24h,
  s.last_offer_at

FROM event e

LEFT JOIN instructor_current_zone icz
  ON icz.instructor_id = e.instructor_id

LEFT JOIN instructor_scoring s
  ON s.instructor_id = e.instructor_id

LEFT JOIN LATERAL (
  SELECT (payload->>'zone_id')::int AS zone_id
  FROM event
  WHERE identity_id = e.identity_id
  AND event_type = 'lesson_requested'
  LIMIT 1
) req_zone ON true

WHERE e.event_type = 'lesson_offer_sent';
