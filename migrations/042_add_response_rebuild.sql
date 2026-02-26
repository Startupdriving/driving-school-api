-- ============================================================
-- 042_add_response_rebuild.sql
-- Deterministic response-time rebuild
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
        EXTRACT(EPOCH FROM (c.confirm_time - o.offer_time)) AS response_seconds
    FROM confirmed_events c
    JOIN offer_events o
      ON c.identity_id = o.identity_id
     AND c.instructor_id = o.instructor_id
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

    COUNT(rt.response_seconds),
    COALESCE(AVG(rt.response_seconds), 0),
    COUNT(*) FILTER (WHERE rt.response_seconds <= 30),

    (
        CASE
            WHEN COALESCE(AVG(rt.response_seconds), 9999) <= 30 THEN 1.0
            WHEN COALESCE(AVG(rt.response_seconds), 9999) <= 120 THEN 0.7
            WHEN COALESCE(AVG(rt.response_seconds), 9999) <= 300 THEN 0.4
            ELSE 0.1
        END
        * 0.1
    ),

    NOW()

FROM identity i
LEFT JOIN response_times rt
       ON i.id = rt.instructor_id
WHERE i.identity_type = 'instructor'
GROUP BY i.id;
