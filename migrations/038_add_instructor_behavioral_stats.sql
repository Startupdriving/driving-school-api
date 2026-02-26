-- ============================================================
-- 038_add_instructor_behavioral_stats.sql
-- Strategic anti-gaming behavioral projection
-- ============================================================

CREATE TABLE IF NOT EXISTS instructor_behavioral_stats (
    instructor_id uuid PRIMARY KEY REFERENCES identity(id) ON DELETE CASCADE,

    -- Streak metrics
    ignore_streak integer NOT NULL DEFAULT 0,
    cancellation_streak integer NOT NULL DEFAULT 0,

    -- Wave bias tracking
    wave1_accepts_24h integer NOT NULL DEFAULT 0,
    total_accepts_24h integer NOT NULL DEFAULT 0,

    -- Late acceptance tracking
    late_accepts_24h integer NOT NULL DEFAULT 0,

    -- Computed behavioral penalty
    behavioral_penalty numeric NOT NULL DEFAULT 0,

    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_penalty
ON instructor_behavioral_stats(behavioral_penalty);
