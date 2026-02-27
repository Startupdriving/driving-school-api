-- ============================================================
-- 045_add_liquidity_pressure_projection.sql
-- Marketplace liquidity pressure projection
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_liquidity_pressure (
    id boolean PRIMARY KEY DEFAULT true,

    avg_economic_score numeric NOT NULL DEFAULT 0,
    avg_response_score numeric NOT NULL DEFAULT 0,

    active_instructor_count integer NOT NULL DEFAULT 0,
    active_request_count integer NOT NULL DEFAULT 0,

    pressure_score numeric NOT NULL DEFAULT 0,

    suggested_wave_size integer NOT NULL DEFAULT 1,

    updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO marketplace_liquidity_pressure (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;
