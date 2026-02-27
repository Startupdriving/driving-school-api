-- 051_update_liquidity_rebuild_with_smoothing.sql

-- Ensure columns exist (idempotent safety)
ALTER TABLE marketplace_liquidity_pressure
ADD COLUMN IF NOT EXISTS raw_wave_size INT DEFAULT 1;

ALTER TABLE marketplace_liquidity_pressure
ADD COLUMN IF NOT EXISTS smoothed_wave_size NUMERIC DEFAULT 1;

WITH liquidity_calc AS (
    SELECT
        (SELECT COUNT(*) FROM current_instructor_runtime_state
         WHERE runtime_state = 'online') AS online_instructors,

        (SELECT COUNT(*) FROM event
         WHERE event_type = 'lesson_requested'
         AND created_at > NOW() - INTERVAL '5 minutes') AS recent_requests
),

raw_wave AS (
    SELECT
        GREATEST(
            1,
            LEAST(
                5,
                CEIL(
                    COALESCE(recent_requests::numeric, 0)
                    / NULLIF(online_instructors, 0)
                )
            )
        )::int AS new_raw_wave_size
    FROM liquidity_calc
),

previous_state AS (
    SELECT raw_wave_size, smoothed_wave_size
    FROM marketplace_liquidity_pressure
    WHERE id = true
),

smoothing AS (
    SELECT
        r.new_raw_wave_size,
        COALESCE(
            (p.smoothed_wave_size * 0.7) +
            (r.new_raw_wave_size * 0.3),
            r.new_raw_wave_size
        ) AS new_smoothed_wave
    FROM raw_wave r
    LEFT JOIN previous_state p ON true
)

UPDATE marketplace_liquidity_pressure
SET
    raw_wave_size = s.new_raw_wave_size,
    smoothed_wave_size = s.new_smoothed_wave,
    suggested_wave_size = GREATEST(
        1,
        LEAST(5, ROUND(s.new_smoothed_wave)::int)
    ),
    updated_at = NOW()
FROM smoothing s
WHERE id = true;
