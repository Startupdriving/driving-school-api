CREATE TABLE zone_liquidity_pressure (
  zone_id INT PRIMARY KEY REFERENCES geo_zones(id),

  online_instructors INT NOT NULL DEFAULT 0,
  recent_requests_5m INT NOT NULL DEFAULT 0,

  raw_wave_size INT NOT NULL DEFAULT 1,
  smoothed_wave_size NUMERIC(10,4) NOT NULL DEFAULT 1,
  suggested_wave_size INT NOT NULL DEFAULT 1,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
