-- Active instructors
CREATE OR REPLACE VIEW current_active_instructors AS
SELECT id
FROM identity i
WHERE identity_type = 'instructor'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'instructor_deactivated'
);

-- Available cars
CREATE OR REPLACE VIEW available_cars AS
SELECT id
FROM identity i
WHERE identity_type = 'car'
AND NOT EXISTS (
    SELECT 1
    FROM event e
    WHERE e.identity_id = i.id
    AND e.event_type = 'car_deactivated'
);

-- Record migration version
INSERT INTO schema_version (version)
VALUES (3)
ON CONFLICT (version) DO NOTHING;
