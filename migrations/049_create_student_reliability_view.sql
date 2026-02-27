-- ============================================================
-- 049_create_student_reliability_view.sql
-- Read-model view for student reliability scoring
-- ============================================================

CREATE OR REPLACE VIEW student_reliability AS
SELECT
    s.student_id,
    s.total_requests_30d,
    s.confirmed_lessons_30d,
    s.expired_requests_30d,
    s.completion_rate,
    s.abandon_rate,
    s.reliability_score
FROM student_behavioral_stats s;
