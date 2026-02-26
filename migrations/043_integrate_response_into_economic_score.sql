-- ============================================================
-- 043_integrate_response_into_economic_score.sql
-- Integrate response-time liquidity optimization
-- ============================================================

-- Drop dependent scoring view first
DROP VIEW IF EXISTS instructor_scoring;

-- Drop economic view
DROP VIEW IF EXISTS instructor_economic_stats;

-- Recreate economic view with response component
CREATE VIEW instructor_economic_stats AS
SELECT
    fs.instructor_id,

    (
        (
            COALESCE(fs.confirmed_last_24h::numeric /
            NULLIF(fs.offers_last_24h, 0), 0)
            * 0.6
        )
        -
        (
            COALESCE(
                (fs.offers_last_24h - fs.confirmed_last_24h)::numeric
                / NULLIF(fs.offers_last_24h, 0),
                0
            )
            * 0.2
        )
        -
        COALESCE(bs.behavioral_penalty, 0)
        +
        COALESCE(rs.response_score, 0)
    ) AS economic_score

FROM instructor_offer_stats fs
LEFT JOIN instructor_behavioral_stats bs
       ON fs.instructor_id = bs.instructor_id
LEFT JOIN instructor_response_stats rs
       ON fs.instructor_id = rs.instructor_id;

-- Recreate scoring view
CREATE VIEW instructor_scoring AS
SELECT
    i.id AS instructor_id,
    COALESCE(es.economic_score, 0) AS economic_score,
    COALESCE(fs.offers_last_24h, 0) AS offers_last_24h,
    fs.last_offer_at,
    COALESCE(active.active_offers, 0) AS active_offers
FROM identity i
LEFT JOIN instructor_economic_stats es
       ON i.id = es.instructor_id
LEFT JOIN instructor_offer_stats fs
       ON i.id = fs.instructor_id
LEFT JOIN current_instructor_active_offers active
       ON i.id = active.instructor_id
WHERE i.identity_type = 'instructor';
