-- ============================================================
-- 044_decay_weighted_response.sql
-- Recency-weighted liquidity scoring
-- ============================================================

TRUNCATE instructor_response_stats;

WITH offer_events AS (
    SELECT
        instructor_id,
        identity_id,
        created_at AS offer_time
    FROM event
    WHERE event_type = 'lesson_offer_sent'
      AND instructor_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours'
),

confirmed_events AS (
    SELECT
        instructor_id,
        identity_id,
        created_at AS confirm_time
    FROM event
    WHERE event_type = 'lesson_confirmed'
      AND instructor_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours'
),

response_times AS (
    SELECT
        c.instructor_id,
        EXTRACT(EPOCH FROM (c.confirm_time - o.offer_time)) AS response_seconds,
        c.confirm_time
    FROM confirmed_events c
    JOIN offer_events o
      ON c.identity_id = o.identity_id
     AND c.instructor_id = o.instructor_id
),

aggregated AS (
    SELECT
        instructor_id,
        COUNT(response_seconds) AS total_confirmed,
        AVG(response_seconds) AS avg_response_seconds,
        MAX(confirm_time) AS last_confirm_time
    FROM response_times
    GROUP BY instructor_id
)

INSERT INTO instructor_response_stats (
    instructor_id,
    total_confirmed_24h,
    avg_response_seconds_24h,
    fast_accept_count_24h,
    response_score,
    updated_at
)

SELECT
    i.id,

    COALESCE(a.total_confirmed, 0),
    COALESCE(a.avg_response_seconds, 0),

    0,  -- optional future fast bucket

    (
        CASE
            WHEN COALESCE(a.avg_response_seconds, 9999) <= 30 THEN 1.0
            WHEN COALESCE(a.avg_response_seconds, 9999) <= 120 THEN 0.7
            WHEN COALESCE(a.avg_response_seconds, 9999) <= 300 THEN 0.4
            ELSE 0.1
        END
        *
        (
            CASE
                WHEN a.last_confirm_time IS NULL THEN 0.1
                ELSE
                    1.0 /
                    (
                        1 +
                        (
                            EXTRACT(EPOCH FROM (NOW() - a.last_confirm_time))
                            / 3600
                        )
                    )
            END
        )
        *
        0.1
    ) AS response_score,

    NOW()

FROM identity i
LEFT JOIN aggregated a
       ON i.id = a.instructor_id
WHERE i.identity_type = 'instructor';
