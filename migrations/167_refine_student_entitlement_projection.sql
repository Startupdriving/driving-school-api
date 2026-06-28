BEGIN;

ALTER TABLE student_entitlement_projection

ADD COLUMN last_transaction_at TIMESTAMPTZ,

ADD COLUMN last_event_sequence BIGINT,

ADD COLUMN last_event_type TEXT;

COMMIT;
