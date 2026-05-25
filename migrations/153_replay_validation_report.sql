CREATE TABLE replay_validation_report (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  replay_id UUID NOT NULL
    REFERENCES replay_audit_log(id)
    ON DELETE CASCADE,

  projection_name TEXT NOT NULL,

  expected_sequence BIGINT NOT NULL,

  actual_sequence BIGINT NOT NULL,

  lag BIGINT NOT NULL,

  projection_row_count BIGINT NOT NULL,

  validation_status TEXT NOT NULL,

  validated_at TIMESTAMPTZ
    DEFAULT NOW()

);
