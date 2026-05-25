CREATE TABLE governance_incident (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  incident_type TEXT NOT NULL,

  severity TEXT NOT NULL,

  affected_stream TEXT,

  projection_name TEXT,

  violation_type TEXT NOT NULL,

  recommended_action TEXT,

  governance_status TEXT
    NOT NULL DEFAULT 'open',

  incident_payload JSONB
    NOT NULL DEFAULT '{}'::jsonb,

  detected_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW(),

  resolved_at TIMESTAMPTZ

);
