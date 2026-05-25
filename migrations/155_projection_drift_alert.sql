CREATE TABLE projection_drift_alert (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  projection_name TEXT NOT NULL,

  expected_sequence BIGINT NOT NULL,

  actual_sequence BIGINT NOT NULL,

  lag BIGINT NOT NULL,

  drift_status TEXT NOT NULL,

  severity TEXT NOT NULL,

  alert_message TEXT NOT NULL,

  detected_at TIMESTAMPTZ
    DEFAULT NOW(),

  resolved_at TIMESTAMPTZ

);
