-- Allow availability event
INSERT INTO identity_event_rule (identity_type, event_type)
VALUES ('instructor', 'instructor_availability_set')
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO schema_version (version)
VALUES (9)
ON CONFLICT (version) DO NOTHING;
