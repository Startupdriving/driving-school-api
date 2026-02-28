-- 056_create_instructor_enabled_zones.sql

CREATE TABLE instructor_enabled_zones (
    instructor_id UUID NOT NULL,
    zone_id INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (instructor_id, zone_id),

    CONSTRAINT fk_enabled_zone_instructor
        FOREIGN KEY (instructor_id)
        REFERENCES identity(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enabled_zone_zone
        FOREIGN KEY (zone_id)
        REFERENCES geo_zones(id)
        ON DELETE CASCADE
);

-- Index for fast dispatch filtering
CREATE INDEX idx_enabled_zones_instructor
ON instructor_enabled_zones(instructor_id);

CREATE INDEX idx_enabled_zones_zone
ON instructor_enabled_zones(zone_id);
