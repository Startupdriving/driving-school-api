-- ============================================================
-- 046_rebuild_liquidity_pressure.sql
-- Deterministic liquidity rebuild logic
-- ============================================================

WITH econ AS (
    SELECT AVG(economic_score) AS avg_econ
    FROM instructor_scoring
),

resp AS (
    SELECT AVG(response_score) AS avg_resp
    FROM instructor_response_stats
),

supply AS (
    SELECT COUNT(*) AS online_count
    FROM current_online_instructors
),

demand AS (
    SELECT COUNT(*) AS active_requests
    FROM expirable_lesson_requests
),

calc AS (
    SELECT
        COALESCE(e.avg_econ, 0) AS avg_econ,
        COALESCE(r.avg_resp, 0) AS avg_resp,
        COALESCE(s.online_count, 0) AS online_count,
        COALESCE(d.active_requests, 0) AS active_requests
    FROM econ e, resp r, supply s, demand d
)

UPDATE marketplace_liquidity_pressure
SET
    avg_economic_score = c.avg_econ,
    avg_response_score = c.avg_resp,
    active_instructor_count = c.online_count,
    active_request_count = c.active_requests,

    pressure_score =
        (1 - c.avg_econ)
        + (1 - c.avg_resp)
        + CASE
            WHEN c.online_count = 0 THEN 1
            ELSE (c.active_requests::numeric / c.online_count)
          END,

    suggested_wave_size =
        CASE
            WHEN
                ((1 - c.avg_econ)
                + (1 - c.avg_resp)
                + CASE
                    WHEN c.online_count = 0 THEN 1
                    ELSE (c.active_requests::numeric / c.online_count)
                  END)
            < 0.8 THEN 1
            WHEN
                ((1 - c.avg_econ)
                + (1 - c.avg_resp)
                + CASE
                    WHEN c.online_count = 0 THEN 1
                    ELSE (c.active_requests::numeric / c.online_count)
                  END)
            < 1.2 THEN 2
            WHEN
                ((1 - c.avg_econ)
                + (1 - c.avg_resp)
                + CASE
                    WHEN c.online_count = 0 THEN 1
                    ELSE (c.active_requests::numeric / c.online_count)
                  END)
            < 1.6 THEN 3
            ELSE 4
        END,

    updated_at = NOW()
FROM calc c
WHERE id = true;
