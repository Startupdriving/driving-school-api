-- ============================================================
-- 040_update_economic_score_with_behavior.sql
-- Integrate behavioral penalty into economic scoring
-- ============================================================

CREATE OR REPLACE VIEW instructor_economic_stats AS
SELECT
    e.instructor_id,

    (
        (
            COALESCE(e.confirmed_last_24h::numeric /
            NULLIF(e.offers_last_24h, 0), 0)
            * 0.6
        )
        -
        (
            COALESCE(e.ignored_last_24h::numeric /
            NULLIF(e.offers_last_24h, 0), 0)
            * 0.2
        )
        -
        (
            COALESCE(e.cancelled_after_accept_last_24h::numeric /
            NULLIF(e.confirmed_last_24h, 0), 0)
            * 0.8
        )
        -
        COALESCE(b.behavioral_penalty, 0)
    ) AS economic_score

FROM instructor_offer_stats e
LEFT JOIN instructor_behavioral_stats b
       ON e.instructor_id = b.instructor_id;
