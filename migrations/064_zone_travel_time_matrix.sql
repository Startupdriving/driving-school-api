-- ensure table exists
CREATE TABLE IF NOT EXISTS zone_travel_time_matrix (
  from_zone_id INT NOT NULL,
  to_zone_id INT NOT NULL,
  estimated_minutes NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_zone_id, to_zone_id)
);

-- ensure column exists
ALTER TABLE zone_travel_time_matrix
ADD COLUMN IF NOT EXISTS estimated_minutes NUMERIC(5,2);

INSERT INTO zone_travel_time_matrix
(from_zone_id, to_zone_id, avg_travel_minutes, estimated_minutes)
SELECT
  a.id,
  b.id,
  CASE
    WHEN a.id = b.id THEN 5
    ELSE 20
  END,
  CASE
    WHEN a.id = b.id THEN 5
    ELSE 20
  END
FROM geo_zones a
CROSS JOIN geo_zones b
ON CONFLICT (from_zone_id, to_zone_id)
DO UPDATE SET
  avg_travel_minutes = EXCLUDED.avg_travel_minutes,
  estimated_minutes = EXCLUDED.estimated_minutes;
