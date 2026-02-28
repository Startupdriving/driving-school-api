-- 055_add_instructor_home_zone.sql

ALTER TABLE identity
ADD COLUMN home_zone_id INT;

ALTER TABLE identity
ADD CONSTRAINT fk_instructor_home_zone
FOREIGN KEY (home_zone_id)
REFERENCES geo_zones(id)
ON DELETE SET NULL;

-- Optional index for dispatch speed
CREATE INDEX idx_identity_home_zone
ON identity(home_zone_id)
WHERE identity_type = 'instructor';
