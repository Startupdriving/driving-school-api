CREATE TABLE projection_event_log (

  projection_name TEXT NOT NULL,

  event_id UUID NOT NULL,

  processed_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW(),

  PRIMARY KEY (
    projection_name,
    event_id
  )

);
