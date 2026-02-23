-- ============================================
-- Instructor Scoring View
-- ============================================

CREATE OR REPLACE VIEW instructor_scoring AS
WITH

offer_stats AS (
  SELECT
    instructor_id,
    COUNT(*) AS offers_sent
  FROM event
  WHERE event_type = 'lesson_offer_sent'
  GROUP BY instructor_id
),

accept_stats AS (
  SELECT
    instructor_id,
    COUNT(*) AS offers_accepted
  FROM event
  WHERE event_type = 'lesson_offer_accepted'
  GROUP BY instructor_id
),

cancel_stats AS (
  SELECT
    instructor_id,
    COUNT(*) AS lessons_cancelled
  FROM event
  WHERE event_type = 'lesson_cancelled'
  GROUP BY instructor_id
)

SELECT
  i.id AS instructor_id,

  COALESCE(a.offers_accepted::float / NULLIF(o.offers_sent, 0), 0) AS acceptance_rate,

  COALESCE(c.lessons_cancelled::float / NULLIF(a.offers_accepted, 0), 0) AS cancellation_rate,

  COALESCE(active.active_offers, 0) AS active_offers,

  (
    (COALESCE(a.offers_accepted::float / NULLIF(o.offers_sent, 0), 0) * 0.6)
    +
    ((1 - COALESCE(c.lessons_cancelled::float / NULLIF(a.offers_accepted, 0), 0)) * 0.2)
    +
    ((1.0 / (1 + COALESCE(active.active_offers, 0))) * 0.2)
  ) AS score

FROM identity i
LEFT JOIN offer_stats o ON i.id = o.instructor_id
LEFT JOIN accept_stats a ON i.id = a.instructor_id
LEFT JOIN cancel_stats c ON i.id = c.instructor_id
LEFT JOIN current_instructor_active_offers active
       ON i.id = active.instructor_id

WHERE i.identity_type = 'instructor';
