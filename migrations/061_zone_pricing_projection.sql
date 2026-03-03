-- migration/061_zone_pricing_projection.sql

CREATE TABLE IF NOT EXISTS zone_pricing_projection (
    zone_id INTEGER PRIMARY KEY REFERENCES geo_zones(id),

    supply_ratio NUMERIC(10,4) NOT NULL DEFAULT 1.0,
    drain_risk_score NUMERIC(10,4) NOT NULL DEFAULT 0.0,

    surge_multiplier NUMERIC(10,4) NOT NULL DEFAULT 1.0,

    reason_code TEXT NOT NULL DEFAULT 'normal',

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
