-- Drop old available_cars view if exists
DROP VIEW IF EXISTS available_cars;

-- Create symmetric current_active_cars view
CREATE OR REPLACE VIEW current_active_cars AS
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
VALUES (5)
ON CONFLICT (version) DO NOTHING;
