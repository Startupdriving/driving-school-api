-- 050_add_wave_smoothing.sql

ALTER TABLE marketplace_liquidity_pressure
ADD COLUMN raw_wave_size INT DEFAULT 1;

ALTER TABLE marketplace_liquidity_pressure
ADD COLUMN smoothed_wave_size NUMERIC DEFAULT 1;

UPDATE marketplace_liquidity_pressure
SET raw_wave_size = suggested_wave_size,
    smoothed_wave_size = suggested_wave_size;
