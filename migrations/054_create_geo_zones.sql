-- 054_create_geo_zones.sql

CREATE TABLE geo_zones (
    id SERIAL PRIMARY KEY,
    zone_code TEXT UNIQUE NOT NULL,
    zone_name TEXT NOT NULL,
    min_lat NUMERIC NOT NULL,
    max_lat NUMERIC NOT NULL,
    min_lng NUMERIC NOT NULL,
    max_lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_zones_bounds
ON geo_zones (min_lat, max_lat, min_lng, max_lng);

INSERT INTO geo_zones (zone_code, zone_name, min_lat, max_lat, min_lng, max_lng)
VALUES
('Z1', 'DHA',         31.4300, 31.5200, 74.3800, 74.4700),
('Z2', 'Gulberg',     31.5000, 31.5600, 74.3300, 74.4000),
('Z3', 'Johar Town',  31.4500, 31.5000, 74.2500, 74.3200),
('Z4', 'Wapda Town',  31.4300, 31.4700, 74.2600, 74.3100),
('Z5', 'Model Town',  31.4600, 31.5100, 74.3100, 74.3600),
('Z6', 'Township',    31.4200, 31.4700, 74.2800, 74.3300),
('Z7', 'Shahdara',    31.6000, 31.6600, 74.3100, 74.3600),
('Z8', 'Cantt',       31.4800, 31.5300, 74.3600, 74.4200);
