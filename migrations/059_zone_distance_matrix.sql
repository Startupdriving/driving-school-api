CREATE TABLE zone_distance_matrix (
  from_zone_id INT REFERENCES geo_zones(id),
  to_zone_id   INT REFERENCES geo_zones(id),

  distance_level INT NOT NULL,
  penalty_score NUMERIC(5,4) NOT NULL,

  PRIMARY KEY (from_zone_id, to_zone_id)
);
