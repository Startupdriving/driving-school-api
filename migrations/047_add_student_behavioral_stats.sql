-- ============================================================
-- 047_add_student_behavioral_stats.sql
-- Demand-side behavioral projection
-- ============================================================

CREATE TABLE IF NOT EXISTS student_behavioral_stats (
    student_id uuid PRIMARY KEY REFERENCES identity(id) ON DELETE CASCADE,

    total_requests_30d integer NOT NULL DEFAULT 0,
    confirmed_lessons_30d integer NOT NULL DEFAULT 0,
    expired_requests_30d integer NOT NULL DEFAULT 0,

    completion_rate numeric NOT NULL DEFAULT 0,
    abandon_rate numeric NOT NULL DEFAULT 0,

    reliability_score numeric NOT NULL DEFAULT 0,

    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_reliability_score
ON student_behavioral_stats(reliability_score);
