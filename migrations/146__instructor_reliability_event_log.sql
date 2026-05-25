CREATE TABLE instructor_reliability_event_log (

  event_id UUID PRIMARY KEY,

  instructor_id UUID NOT NULL,

  metric_type TEXT NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW()

);
