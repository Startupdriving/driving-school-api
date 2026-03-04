CREATE TABLE IF NOT EXISTS zone_travel_time_matrix (
    from_zone_id INT REFERENCES geo_zones(id),
    to_zone_id INT REFERENCES geo_zones(id),

    avg_travel_minutes NUMERIC(6,2) NOT NULL,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (from_zone_id, to_zone_id)
);
