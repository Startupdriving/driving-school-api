-- 053_fix_zero_online_edge_case.sql

WITH liquidity_calc AS (
    SELECT
        (SELECT COUNT(*)
         FROM current_instructor_runtime_state
         WHERE runtime_state = 'online') AS online_instructors,

        (SELECT COUNT(*)
         FROM event
         WHERE event_type = 'lesson_requested'
         AND created_at > NOW() - INTERVAL '5 minutes') AS recent_requests
),

raw_wave AS (
    SELECT
        CASE
            WHEN online_instructors = 0 THEN 1
            ELSE GREATEST(
                1,
                LEAST(
                    5,
                    CEIL(
                        recent_requests::numeric
                        / online_instructors
                    )
                )
            )
        END::int AS new_raw_wave_size
    FROM liquidity_calc
),

previous_state AS (
    SELECT
        raw_wave_size,
        smoothed_wave_size,
        suggested_wave_size
    FROM marketplace_liquidity_pressure
    WHERE id = true
),

smoothing AS (
    SELECT
        r.new_raw_wave_size,
        ROUND(
            COALESCE(
                (p.smoothed_wave_size * 0.7) +
                (r.new_raw_wave_size * 0.3),
                r.new_raw_wave_size
            ),
            4
        ) AS new_smoothed_wave,
        p.suggested_wave_size AS previous_suggested
    FROM raw_wave r
    LEFT JOIN previous_state p ON true
),

clamped AS (
    SELECT
        new_raw_wave_size,
        new_smoothed_wave,
        previous_suggested,
        ROUND(new_smoothed_wave)::int AS candidate_wave,
        CASE
            WHEN ROUND(new_smoothed_wave)::int - previous_suggested > 1
                THEN previous_suggested + 1
            WHEN ROUND(new_smoothed_wave)::int - previous_suggested < -1
                THEN previous_suggested - 1
            ELSE ROUND(new_smoothed_wave)::int
        END AS clamped_wave
    FROM smoothing
)

UPDATE marketplace_liquidity_pressure
SET
    raw_wave_size = c.new_raw_wave_size,
    smoothed_wave_size = c.new_smoothed_wave,
    suggested_wave_size = GREATEST(
        1,
        LEAST(5, c.clamped_wave)
    ),
    updated_at = NOW()
FROM clamped c
WHERE id = true;
