CREATE TABLE IF NOT EXISTS dead_letter_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  original_event_id UUID NOT NULL,

  identity_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB,

  error_message TEXT,

  retry_count INT DEFAULT 0,

  failed_at TIMESTAMPTZ DEFAULT NOW()
);
