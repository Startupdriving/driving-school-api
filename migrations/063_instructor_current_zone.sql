CREATE TABLE IF NOT EXISTS instructor_current_zone (
    instructor_id UUID PRIMARY KEY REFERENCES identity(id),

    zone_id INT REFERENCES geo_zones(id),

    lat NUMERIC(9,6),
    lng NUMERIC(9,6),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
