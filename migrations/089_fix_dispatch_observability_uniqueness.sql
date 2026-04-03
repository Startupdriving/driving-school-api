DROP VIEW IF EXISTS dispatch_observability_projection;

CREATE VIEW dispatch_observability_projection AS
SELECT DISTINCT ON (lesson_request_id, instructor_id, wave)
  lesson_request_id,
  instructor_id,
  wave,
  offer_created_at,
  instructor_zone,
  request_zone,
  economic_score,
  offers_last_24h,
  last_offer_at
FROM (
  SELECT
    e.identity_id AS lesson_request_id,
    e.instructor_id,
    (e.payload ->> 'wave')::integer AS wave,
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
    SELECT (event.payload ->> 'zone_id')::integer AS zone_id
    FROM event
    WHERE event.identity_id = e.identity_id
      AND event.event_type = 'lesson_requested'
    LIMIT 1
  ) req_zone ON true
  WHERE e.event_type = 'lesson_offer_sent'
) base

-- 🚨 IMPORTANT FILTER
WHERE wave IS NOT NULL

-- 🚨 MOST IMPORTANT PART
ORDER BY
  lesson_request_id,
  instructor_id,
  wave,
  offer_created_at DESC;
