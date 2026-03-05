CREATE TABLE IF NOT EXISTS zone_travel_time_matrix (

  from_zone_id INT NOT NULL,
  to_zone_id INT NOT NULL,

  estimated_minutes NUMERIC(5,2) NOT NULL,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (from_zone_id, to_zone_id),

  FOREIGN KEY (from_zone_id) REFERENCES geo_zones(id),
  FOREIGN KEY (to_zone_id) REFERENCES geo_zones(id)

);

INSERT INTO zone_travel_time_matrix
(from_zone_id, to_zone_id, estimated_minutes)
SELECT
  a.id,
  b.id,
  CASE
    WHEN a.id = b.id THEN 5
    ELSE 20
  END
FROM geo_zones a
CROSS JOIN geo_zones b
ON CONFLICT (from_zone_id, to_zone_id) DO NOTHING;
