-- ============================================================
-- 037_replace_instructor_scoring.sql
-- Replace legacy scoring view with economic + fairness model
-- ============================================================

-- Drop old scoring view
DROP VIEW IF EXISTS instructor_scoring;

-- Recreate scoring view using economic layer
CREATE VIEW instructor_scoring AS
SELECT
    i.id AS instructor_id,

    -- Economic incentive score
    COALESCE(es.economic_score, 0) AS economic_score,

    -- Fairness distribution metrics
    COALESCE(fs.offers_last_24h, 0) AS offers_last_24h,
    fs.last_offer_at,

    -- Capacity enforcement
    COALESCE(active.active_offers, 0) AS active_offers

FROM identity i

LEFT JOIN instructor_economic_stats es
       ON i.id = es.instructor_id

LEFT JOIN instructor_offer_stats fs
       ON i.id = fs.instructor_id

LEFT JOIN current_instructor_active_offers active
       ON i.id = active.instructor_id

WHERE i.identity_type = 'instructor';
