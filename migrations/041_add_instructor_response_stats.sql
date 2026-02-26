-- ============================================================
-- 041_add_instructor_response_stats.sql
-- Liquidity response-time projection
-- ============================================================

CREATE TABLE IF NOT EXISTS instructor_response_stats (
    instructor_id uuid PRIMARY KEY REFERENCES identity(id) ON DELETE CASCADE,

    total_confirmed_24h integer NOT NULL DEFAULT 0,
    avg_response_seconds_24h numeric NOT NULL DEFAULT 0,
    fast_accept_count_24h integer NOT NULL DEFAULT 0,

    response_score numeric NOT NULL DEFAULT 0,

    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_score
ON instructor_response_stats(response_score);
