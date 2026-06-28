BEGIN;

CREATE TABLE student_entitlement_projection (

    student_id UUID PRIMARY KEY,

    total_created_credits INTEGER NOT NULL DEFAULT 0,

    available_credits INTEGER NOT NULL DEFAULT 0,

    reserved_credits INTEGER NOT NULL DEFAULT 0,

    consumed_credits INTEGER NOT NULL DEFAULT 0,

    expired_credits INTEGER NOT NULL DEFAULT 0,

    adjustment_credits INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_total_created_credits
        CHECK (total_created_credits >= 0),

    CONSTRAINT chk_available_credits
        CHECK (available_credits >= 0),

    CONSTRAINT chk_reserved_credits
        CHECK (reserved_credits >= 0),

    CONSTRAINT chk_consumed_credits
        CHECK (consumed_credits >= 0),

    CONSTRAINT chk_expired_credits
        CHECK (expired_credits >= 0)

);

COMMIT;
