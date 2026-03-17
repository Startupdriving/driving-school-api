-- instructor_location_projection
-- stores the latest known GPS position for each instructor

CREATE TABLE IF NOT EXISTS instructor_location_projection (

  instructor_id uuid PRIMARY KEY,

  lat numeric NOT NULL,

  lng numeric NOT NULL,

  zone_id integer,

  updated_at timestamptz NOT NULL DEFAULT NOW()

);
