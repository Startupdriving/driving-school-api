INSERT INTO identity_event_rule (
    identity_type,
    event_type
)
VALUES
('package', 'package_created'),
('package', 'package_updated'),
('package', 'package_deactivated')
ON CONFLICT DO NOTHING;
