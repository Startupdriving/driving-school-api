INSERT INTO identity_event_rule (
    identity_type,
    event_type
)
VALUES
    ('student_entitlement', 'entitlement_reserved'),
    ('student_entitlement', 'entitlement_released'),
    ('student_entitlement', 'entitlement_consumed'),
    ('student_entitlement', 'entitlement_expired'),
    ('student_entitlement', 'entitlement_adjusted')
ON CONFLICT (
    identity_type,
    event_type
)
DO NOTHING;
