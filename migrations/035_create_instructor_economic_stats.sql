-- ============================================================
-- 035_create_instructor_economic_stats.sql
-- Economic hardening projection table
-- Deterministic, event-derived, rebuildable
-- ============================================================

CREATE TABLE IF NOT EXISTS instructor_economic_stats (
    instructor_id uuid PRIMARY KEY,

    offers_last_24h int NOT NULL DEFAULT 0,
    confirmed_last_24h int NOT NULL DEFAULT 0,
    ignored_last_24h int NOT NULL DEFAULT 0,
    cancelled_after_accept_last_24h int NOT NULL DEFAULT 0,

    acceptance_rate double precision NOT NULL DEFAULT 0,
    ignore_rate double precision NOT NULL DEFAULT 0,
    cancellation_rate double precision NOT NULL DEFAULT 0,

    economic_score double precision NOT NULL DEFAULT 0,

    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index for ordering in scoring joins
CREATE INDEX IF NOT EXISTS idx_instructor_economic_score
ON instructor_economic_stats (economic_score DESC);
