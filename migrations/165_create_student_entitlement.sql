BEGIN;

CREATE TABLE student_entitlement (

    student_id UUID PRIMARY KEY,

    aggregate_version BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

COMMIT;



ALTER TABLE student_entitlement

ADD CONSTRAINT chk_student_entitlement_version

CHECK (aggregate_version >= 0);
