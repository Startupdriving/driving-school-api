-- View: current_scheduled_lessons
CREATE OR REPLACE VIEW current_scheduled_lessons AS
SELECT 
    i.id,
    e.payload
FROM identity i
JOIN event e 
    ON i.id = e.identity_id
WHERE i.identity_type = 'lesson'
AND e.event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1 FROM event c
    WHERE c.identity_id = i.id
    AND c.event_type = 'lesson_cancelled'
)
AND NOT EXISTS (
    SELECT 1 FROM event c
    WHERE c.identity_id = i.id
    AND c.event_type = 'lesson_completed'
);

-- Record migration
INSERT INTO schema_version (version)
VALUES (7)
ON CONFLICT (version) DO NOTHING;
