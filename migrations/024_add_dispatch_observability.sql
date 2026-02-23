CREATE OR REPLACE VIEW active_lesson_requests AS
SELECT i.id AS lesson_request_id
FROM identity i
WHERE i.identity_type = 'lesson_request'
AND EXISTS (
    SELECT 1 FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'lesson_requested'
)
AND NOT EXISTS (
    SELECT 1 FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type IN ('lesson_confirmed', 'lesson_request_expired')
);


CREATE OR REPLACE VIEW expired_lesson_requests AS
SELECT e.identity_id AS lesson_request_id,
       e.created_at AS expired_at,
       e.payload->>'reason' AS reason
FROM event e
WHERE e.event_type = 'lesson_request_expired';


CREATE OR REPLACE VIEW confirmed_lesson_requests AS
SELECT e.identity_id AS lesson_request_id,
       e.created_at AS confirmed_at
FROM event e
WHERE e.event_type = 'lesson_confirmed';


CREATE OR REPLACE VIEW dispatch_conversion_rate AS
SELECT
  (SELECT COUNT(*) FROM event WHERE event_type = 'lesson_confirmed')::float
  /
  NULLIF(
    (SELECT COUNT(*) FROM event WHERE event_type = 'lesson_requested'),
    0
  ) AS conversion_rate;


CREATE OR REPLACE VIEW average_waves_per_request AS
SELECT AVG(wave_count)::float AS avg_waves
FROM (
  SELECT identity_id,
         COUNT(*) AS wave_count
  FROM event
  WHERE event_type = 'lesson_request_dispatch_started'
  GROUP BY identity_id
) t;


CREATE OR REPLACE VIEW instructor_offer_volume AS
SELECT instructor_id,
       COUNT(*) AS offers_sent
FROM event
WHERE event_type = 'lesson_offer_sent'
GROUP BY instructor_id;


CREATE OR REPLACE VIEW instructor_acceptance_rate AS
SELECT
  o.instructor_id,
  COUNT(a.id)::float / NULLIF(COUNT(o.id), 0) AS acceptance_rate
FROM event o
LEFT JOIN event a
  ON o.identity_id = a.identity_id
  AND o.instructor_id = a.instructor_id
  AND a.event_type = 'lesson_offer_accepted'
WHERE o.event_type = 'lesson_offer_sent'
GROUP BY o.instructor_id;
