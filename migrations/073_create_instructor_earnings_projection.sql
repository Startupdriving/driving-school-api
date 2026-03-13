CREATE OR REPLACE VIEW instructor_earnings_projection AS
SELECT
  e.instructor_id,

  COUNT(*) FILTER (
    WHERE e.event_type = 'lesson_completed'
  ) AS lessons_completed,

  SUM(
    CASE
      WHEN e.event_type = 'commission_calculated'
      THEN (e.payload->>'lesson_price')::numeric
      ELSE 0
    END
  ) AS total_lesson_value,

  SUM(
    CASE
      WHEN e.event_type = 'commission_calculated'
      THEN (e.payload->>'platform_commission')::numeric
      ELSE 0
    END
  ) AS platform_commission_total,

  SUM(
    CASE
      WHEN e.event_type = 'commission_calculated'
      THEN (e.payload->>'instructor_earnings')::numeric
      ELSE 0
    END
  ) AS instructor_earnings_total,

  MAX(e.created_at) AS last_updated

FROM event e

WHERE e.event_type IN (
  'lesson_completed',
  'commission_calculated'
)
AND e.instructor_id IS NOT NULL

GROUP BY e.instructor_id;
