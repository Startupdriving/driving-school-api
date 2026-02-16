-- Instructor lesson count
CREATE OR REPLACE VIEW instructor_lesson_stats AS
SELECT
    (e.payload->>'instructor_id')::uuid AS instructor_id,
    COUNT(*) AS total_lessons
FROM event e
WHERE e.event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1 FROM event c
    WHERE c.identity_id = e.identity_id
    AND c.event_type = 'lesson_cancelled'
)
GROUP BY (e.payload->>'instructor_id');

-- Student lesson count
CREATE OR REPLACE VIEW student_lesson_stats AS
SELECT
    (e.payload->>'student_id')::uuid AS student_id,
    COUNT(*) AS total_lessons
FROM event e
WHERE e.event_type = 'lesson_scheduled'
AND NOT EXISTS (
    SELECT 1 FROM event c
    WHERE c.identity_id = e.identity_id
    AND c.event_type = 'lesson_cancelled'
)
GROUP BY (e.payload->>'student_id');

-- Record migration
INSERT INTO schema_version (version)
VALUES (8)
ON CONFLICT (version) DO NOTHING;
