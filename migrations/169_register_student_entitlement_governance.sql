-- =====================================================
-- Aggregate Governance
-- =====================================================

INSERT INTO aggregate_governance_rule (

    aggregate_type,

    birth_event_type,

    allow_pre_birth_events

)

VALUES (

    'student_entitlement',

    'entitlement_created',

    FALSE

)

ON CONFLICT (aggregate_type)

DO NOTHING;


-- =====================================================
-- Identity Event Rules
-- =====================================================

INSERT INTO identity_event_rule (

    identity_type,

    event_type

)

VALUES (

    'student_entitlement',

    'entitlement_created'

)

ON CONFLICT (

    identity_type,

    event_type

)

DO NOTHING;
