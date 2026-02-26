-- ============================================================
-- 039_add_behavioral_rebuild.sql
-- Deterministic behavioral projection rebuild
-- ============================================================

-- Clear table
TRUNCATE instructor_behavioral_stats;

-- Rebuild from event history (24h rolling window)
INSERT INTO instructor_behavioral_stats (
    instructor_id,
    ignore_streak,
    cancellation_streak,
    wave1_accepts_24h,
    total_accepts_24h,
    late_accepts_24h,
    behavioral_penalty,
    updated_at
)
WITH offer_events AS (
    SELECT
        instructor_id,
        identity_id,
        created_at,
        payload->>'wave' AS wave
    FROM event
    WHERE event_type = 'lesson_offer_sent'
      AND instructor_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours'
),
accepted_events AS (
    SELECT
        instructor_id,
        identity_id,
        created_at,
        payload->>'wave' AS wave
    FROM event
    WHERE event_type = 'lesson_confirmed'
      AND instructor_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours'
),
cancelled_events AS (
    SELECT
        instructor_id,
        identity_id,
        created_at
    FROM event
    WHERE event_type = 'lesson_cancelled'
      AND instructor_id IS NOT NULL
      AND created_at > NOW() - INTERVAL '24 hours'
),

ignore_stats AS (
    SELECT
        o.instructor_id,
        COUNT(*) FILTER (
            WHERE NOT EXISTS (
                SELECT 1
                FROM accepted_events a
                WHERE a.identity_id = o.identity_id
                AND a.instructor_id = o.instructor_id
            )
        ) AS ignore_count
    FROM offer_events o
    GROUP BY o.instructor_id
),

cancel_stats AS (
    SELECT
        instructor_id,
        COUNT(*) AS cancel_count
    FROM cancelled_events
    GROUP BY instructor_id
),

accept_stats AS (
    SELECT
        instructor_id,
        COUNT(*) AS total_accepts,
        COUNT(*) FILTER (WHERE wave = '1') AS wave1_accepts
    FROM accepted_events
    GROUP BY instructor_id
)

SELECT
    i.id AS instructor_id,

    -- Ignore streak approximation (24h window)
    COALESCE(ig.ignore_count, 0),

    -- Cancellation streak approximation
    COALESCE(cs.cancel_count, 0),

    -- Wave bias
    COALESCE(ac.wave1_accepts, 0),

    COALESCE(ac.total_accepts, 0),

    -- Late acceptance placeholder (future integration)
    0,

    -- Behavioral penalty formula
    LEAST(
        (
            CASE
                WHEN COALESCE(ig.ignore_count, 0) >= 5 THEN 0.15
                WHEN COALESCE(ig.ignore_count, 0) >= 3 THEN 0.05
                ELSE 0
            END
        )
        +
        (COALESCE(cs.cancel_count, 0) * 0.1)
        +
        (
            CASE
                WHEN COALESCE(ac.total_accepts, 0) > 0
                     AND (ac.wave1_accepts::numeric / ac.total_accepts) > 0.9
                THEN 0.05
                ELSE 0
            END
        ),
        0.5
    ) AS behavioral_penalty,

    NOW()

FROM identity i
LEFT JOIN ignore_stats ig ON i.id = ig.instructor_id
LEFT JOIN cancel_stats cs ON i.id = cs.instructor_id
LEFT JOIN accept_stats ac ON i.id = ac.instructor_id
WHERE i.identity_type = 'instructor';
