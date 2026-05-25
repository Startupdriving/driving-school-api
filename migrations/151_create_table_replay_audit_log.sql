CREATE TABLE replay_audit_log (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  replay_type TEXT NOT NULL,

  projection_name TEXT,

  started_at TIMESTAMPTZ NOT NULL,

  completed_at TIMESTAMPTZ,

  duration_ms BIGINT,

  total_events INTEGER DEFAULT 0,

  successful_events INTEGER DEFAULT 0,

  failed_events INTEGER DEFAULT 0,

  replay_status TEXT NOT NULL,

  error_message TEXT,

  created_at TIMESTAMPTZ
    DEFAULT NOW()

);
