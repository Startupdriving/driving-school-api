-- ============================================
-- Instructor Dispatch Capacity Projection
-- ============================================

CREATE OR REPLACE VIEW current_instructor_active_offers AS
SELECT
  o.instructor_id,
  COUNT(*) AS active_offers
FROM event o
WHERE o.event_type = 'lesson_offer_sent'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = o.identity_id
    AND e.event_type IN (
        'lesson_confirmed',
        'lesson_request_expired'
    )
)
GROUP BY o.instructor_id;
