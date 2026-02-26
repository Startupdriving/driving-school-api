-- ============================================================
-- 040_update_economic_score_with_behavior.sql
-- Integrate behavioral penalty into economic scoring (corrected)
-- ============================================================

DROP VIEW IF EXISTS instructor_economic_stats;

CREATE VIEW instructor_economic_stats AS
SELECT
    fs.instructor_id,

    (
        -- Acceptance component
        (
            COALESCE(fs.confirmed_last_24h::numeric /
            NULLIF(fs.offers_last_24h, 0), 0)
            * 0.6
        )

        -- Volume-based ignore penalty
        -
        (
            COALESCE(
                (fs.offers_last_24h - fs.confirmed_last_24h)::numeric
                / NULLIF(fs.offers_last_24h, 0),
                0
            )
            * 0.2
        )

        -- Behavioral anti-gaming penalty
        -
        COALESCE(bs.behavioral_penalty, 0)

    ) AS economic_score

FROM instructor_offer_stats fs
LEFT JOIN instructor_behavioral_stats bs
       ON fs.instructor_id = bs.instructor_id;
