-- ============================================================
-- 036_backfill_instructor_economic_stats.sql
-- Deterministic economic projection rebuild (24h rolling window)
-- ============================================================

-- Clear table for deterministic rebuild
DELETE FROM instructor_economic_stats;

WITH offers AS (
    SELECT
        o.id,
        o.identity_id,
        o.instructor_id,
        o.created_at
    FROM event o
    WHERE o.event_type = 'lesson_offer_sent'
      AND o.instructor_id IS NOT NULL
      AND o.created_at > now() - INTERVAL '24 hours'
),

confirmed AS (
    SELECT DISTINCT
        c.identity_id,
        c.instructor_id
    FROM event c
    WHERE c.event_type = 'lesson_confirmed'
      AND c.created_at > now() - INTERVAL '24 hours'
),

cancelled_after_accept AS (
    SELECT DISTINCT
        l.instructor_id,
        l.identity_id
    FROM event l
    JOIN event c
      ON c.identity_id = l.identity_id
     AND c.event_type = 'lesson_confirmed'
    WHERE l.event_type = 'lesson_cancelled'
      AND l.created_at > now() - INTERVAL '24 hours'
),

aggregated AS (
    SELECT
        o.instructor_id,

        COUNT(*) AS offers_last_24h,

        COUNT(*) FILTER (
            WHERE EXISTS (
                SELECT 1
                FROM confirmed c
                WHERE c.identity_id = o.identity_id
                  AND c.instructor_id = o.instructor_id
            )
        ) AS confirmed_last_24h,

        COUNT(*) FILTER (
            WHERE NOT EXISTS (
                SELECT 1
                FROM confirmed c
                WHERE c.identity_id = o.identity_id
                  AND c.instructor_id = o.instructor_id
            )
        ) AS ignored_last_24h

    FROM offers o
    GROUP BY o.instructor_id
),

final AS (
    SELECT
        a.instructor_id,
        a.offers_last_24h,
        a.confirmed_last_24h,
        a.ignored_last_24h,

        COALESCE(
            (SELECT COUNT(*)
             FROM cancelled_after_accept ca
             WHERE ca.instructor_id = a.instructor_id),
            0
        ) AS cancelled_after_accept_last_24h

    FROM aggregated a
)

INSERT INTO instructor_economic_stats (
    instructor_id,
    offers_last_24h,
    confirmed_last_24h,
    ignored_last_24h,
    cancelled_after_accept_last_24h,
    acceptance_rate,
    ignore_rate,
    cancellation_rate,
    economic_score,
    updated_at
)
SELECT
    f.instructor_id,
    f.offers_last_24h,
    f.confirmed_last_24h,
    f.ignored_last_24h,
    f.cancelled_after_accept_last_24h,

    -- Acceptance rate
    CASE
        WHEN f.offers_last_24h = 0 THEN 0
        ELSE f.confirmed_last_24h::float / f.offers_last_24h
    END,

    -- Ignore rate
    CASE
        WHEN f.offers_last_24h = 0 THEN 0
        ELSE f.ignored_last_24h::float / f.offers_last_24h
    END,

    -- Cancellation rate
    CASE
        WHEN f.confirmed_last_24h = 0 THEN 0
        ELSE f.cancelled_after_accept_last_24h::float / f.confirmed_last_24h
    END,

    -- Economic score formula (v1)
    (
        (CASE
            WHEN f.offers_last_24h = 0 THEN 0
            ELSE f.confirmed_last_24h::float / f.offers_last_24h
        END) * 0.6

        -

        (CASE
            WHEN f.offers_last_24h = 0 THEN 0
            ELSE f.ignored_last_24h::float / f.offers_last_24h
        END) * 0.2

        -

        (CASE
            WHEN f.confirmed_last_24h = 0 THEN 0
            ELSE f.cancelled_after_accept_last_24h::float / f.confirmed_last_24h
        END) * 0.8
    ) AS economic_score,

    now()

FROM final f;
