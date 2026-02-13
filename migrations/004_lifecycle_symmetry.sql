-- Update instructor projection: require activation event
CREATE OR REPLACE VIEW current_active_instructors AS
SELECT id
FROM identity i
WHERE identity_type = 'instructor'
AND EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'instructor_activated'
)
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'instructor_deactivated'
);

-- Update car projection: require activation event
CREATE OR REPLACE VIEW available_cars AS
SELECT id
FROM identity i
WHERE identity_type = 'car'
AND EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'car_activated'
)
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'car_deactivated'
);

-- Record migration version
INSERT INTO schema_version (version)
VALUES (4)
ON CONFLICT (version) DO NOTHING;
