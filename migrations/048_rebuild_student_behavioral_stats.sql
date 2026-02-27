-- ============================================================
-- 048_rebuild_student_behavioral_stats.sql
-- Deterministic 30-day student behavioral rebuild
-- ============================================================

TRUNCATE student_behavioral_stats;

WITH requested AS (
    SELECT
        (payload->>'student_id')::uuid AS student_id,
        COUNT(*) AS total_requests
    FROM event
    WHERE event_type = 'lesson_requested'
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY (payload->>'student_id')::uuid
),

confirmed AS (
    SELECT
        (e_req.payload->>'student_id')::uuid AS student_id,
        COUNT(*) AS confirmed_count
    FROM event e_conf
    JOIN event e_req
      ON e_conf.identity_id = e_req.identity_id
    WHERE e_conf.event_type = 'lesson_confirmed'
      AND e_conf.created_at > NOW() - INTERVAL '30 days'
      AND e_req.event_type = 'lesson_requested'
    GROUP BY (e_req.payload->>'student_id')::uuid
),

expired AS (
    SELECT
        (e_req.payload->>'student_id')::uuid AS student_id,
        COUNT(*) AS expired_count
    FROM event e_exp
    JOIN event e_req
      ON e_exp.identity_id = e_req.identity_id
    WHERE e_exp.event_type = 'lesson_request_expired'
      AND e_exp.created_at > NOW() - INTERVAL '30 days'
      AND e_req.event_type = 'lesson_requested'
    GROUP BY (e_req.payload->>'student_id')::uuid
),

combined AS (
    SELECT
        i.id AS student_id,
        COALESCE(r.total_requests, 0) AS total_requests,
        COALESCE(c.confirmed_count, 0) AS confirmed_count,
        COALESCE(x.expired_count, 0) AS expired_count
    FROM identity i
    LEFT JOIN requested r ON i.id = r.student_id
    LEFT JOIN confirmed c ON i.id = c.student_id
    LEFT JOIN expired x ON i.id = x.student_id
    WHERE i.identity_type = 'student'
)

INSERT INTO student_behavioral_stats (
    student_id,
    total_requests_30d,
    confirmed_lessons_30d,
    expired_requests_30d,
    completion_rate,
    abandon_rate,
    reliability_score,
    updated_at
)

SELECT
    student_id,
    total_requests,
    confirmed_count,
    expired_count,

    CASE
        WHEN total_requests = 0 THEN 0
        ELSE confirmed_count::numeric / total_requests
    END AS completion_rate,

    CASE
        WHEN total_requests = 0 THEN 0
        ELSE expired_count::numeric / total_requests
    END AS abandon_rate,

    (
        (
            CASE
                WHEN total_requests = 0 THEN 0
                ELSE confirmed_count::numeric / total_requests
            END
            * 0.8
        )
        -
        (
            CASE
                WHEN total_requests = 0 THEN 0
                ELSE expired_count::numeric / total_requests
            END
            * 0.2
        )
    ) AS reliability_score,

    NOW()

FROM combined;
