CREATE TABLE governance_incident_timeline (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  incident_id UUID NOT NULL
    REFERENCES governance_incident(id)
    ON DELETE CASCADE,

  timeline_event TEXT NOT NULL,

  timeline_payload JSONB
    NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW()

);
