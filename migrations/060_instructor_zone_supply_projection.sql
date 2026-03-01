-- migration/060_instructor_zone_supply_projection.sql

CREATE TABLE IF NOT EXISTS instructor_zone_supply_projection (
    zone_id INTEGER PRIMARY KEY REFERENCES geo_zones(id),

    online_instructors INTEGER NOT NULL DEFAULT 0,
    busy_instructors INTEGER NOT NULL DEFAULT 0,

    available_instructors INTEGER NOT NULL DEFAULT 0,

    supply_ratio NUMERIC(10,4) NOT NULL DEFAULT 0, 
    -- available / total_online

    drain_risk_score NUMERIC(10,4) NOT NULL DEFAULT 0,
    -- computed pressure risk

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
