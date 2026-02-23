CREATE OR REPLACE VIEW instructor_earnings AS
SELECT
  p.identity_id AS payment_id,
  (p.payload->>'instructor_share')::float AS instructor_share
FROM event p
WHERE p.event_type = 'commission_calculated'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = p.identity_id
    AND e.event_type = 'payout_completed'
);

CREATE OR REPLACE VIEW platform_revenue AS
SELECT
  SUM((payload->>'commission')::float) AS total_commission
FROM event
WHERE event_type = 'commission_calculated';

CREATE OR REPLACE VIEW revenue_today AS
SELECT
  SUM((payload->>'commission')::float) AS today_commission
FROM event
WHERE event_type = 'commission_calculated'
AND DATE(created_at) = CURRENT_DATE;

CREATE OR REPLACE VIEW pending_payouts AS
SELECT
  COUNT(*) AS pending_count
FROM event p
WHERE p.event_type = 'commission_calculated'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = p.identity_id
    AND e.event_type = 'payout_completed'
);
