-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Identity table
CREATE TABLE IF NOT EXISTS identity (
    id UUID PRIMARY KEY,
    identity_type TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Event table
CREATE TABLE IF NOT EXISTS event (
    id UUID PRIMARY KEY,
    identity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT event_identity_id_fkey
        FOREIGN KEY (identity_id)
        REFERENCES identity(id)
);

-- Identity Event Rule table
CREATE TABLE IF NOT EXISTS identity_event_rule (
    identity_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    PRIMARY KEY (identity_type, event_type)
);

-- Trigger function to validate allowed events
CREATE OR REPLACE FUNCTION validate_identity_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    identity_type_value TEXT;
BEGIN
    SELECT identity_type INTO identity_type_value
    FROM identity
    WHERE id = NEW.identity_id;

    IF NOT EXISTS (
        SELECT 1
        FROM identity_event_rule
        WHERE identity_type = identity_type_value
        AND event_type = NEW.event_type
    ) THEN
        RAISE EXCEPTION
            'Event type % not allowed for identity type %',
            NEW.event_type, identity_type_value;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger binding to event table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_validate_identity_event'
    ) THEN
        CREATE TRIGGER trigger_validate_identity_event
        BEFORE INSERT ON event
        FOR EACH ROW
        EXECUTE FUNCTION validate_identity_event();
    END IF;
END;
$$;

-- View: current_active_students
CREATE OR REPLACE VIEW current_active_students AS
SELECT id
FROM identity i
WHERE identity_type = 'student'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'student_deactivated'
);

-- Record migration version
INSERT INTO schema_version (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;

