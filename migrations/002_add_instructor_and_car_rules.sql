-- Allow instructor events
INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('instructor', 'instructor_created'),
('instructor', 'instructor_activated'),
('instructor', 'instructor_deactivated')
ON CONFLICT DO NOTHING;

-- Allow car events
INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('car', 'car_created'),
('car', 'car_activated'),
('car', 'car_deactivated')
ON CONFLICT DO NOTHING;

-- Record migration version
INSERT INTO schema_version (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;
