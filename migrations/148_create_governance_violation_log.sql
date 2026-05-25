CREATE TABLE governance_violation_log (

  id UUID PRIMARY KEY,

  identity_id UUID,

  event_type TEXT NOT NULL,

  causation_id UUID,

  violation_type TEXT NOT NULL,

  error_message TEXT NOT NULL,

  payload JSONB,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW()

);
