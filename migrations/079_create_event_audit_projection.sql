CREATE OR REPLACE VIEW event_audit_projection AS
SELECT
  identity_id,
  MAX(CASE WHEN event_type='lesson_requested' THEN 1 ELSE 0 END) AS has_requested,
  MAX(CASE WHEN event_type='lesson_confirmed' THEN 1 ELSE 0 END) AS has_confirmed,
  MAX(CASE WHEN event_type='lesson_started' THEN 1 ELSE 0 END) AS has_started,
  MAX(CASE WHEN event_type='lesson_completed' THEN 1 ELSE 0 END) AS has_completed,

  COUNT(*) FILTER (WHERE event_type='lesson_confirmed') AS confirm_count,
  COUNT(*) FILTER (WHERE event_type='lesson_offer_sent') AS offer_count,
  COUNT(*) FILTER (WHERE event_type='lesson_offer_accepted') AS accept_count

FROM event
GROUP BY identity_id;

CREATE OR REPLACE VIEW event_audit_violations AS
SELECT *
FROM event_audit_projection
WHERE
  (has_started = 1 AND has_confirmed = 0)
  OR
  (has_completed = 1 AND has_started = 0)
  OR
  (confirm_count > 1);
