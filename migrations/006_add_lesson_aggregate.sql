-- Allow lesson events
INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('lesson', 'lesson_scheduled'),
('lesson', 'lesson_cancelled'),
('lesson', 'lesson_completed')
ON CONFLICT DO NOTHING;

-- Record migration version
INSERT INTO schema_version (version)
VALUES (6)
ON CONFLICT (version) DO NOTHING;
