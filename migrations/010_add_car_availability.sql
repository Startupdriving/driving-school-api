-- Allow car availability event
INSERT INTO identity_event_rule (identity_type, event_type)
VALUES ('car', 'car_availability_set')
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO schema_version (version)
VALUES (10)
ON CONFLICT (version) DO NOTHING;
