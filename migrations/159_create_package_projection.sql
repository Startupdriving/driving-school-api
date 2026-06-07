CREATE TABLE package_projection (

    package_id UUID PRIMARY KEY,

    name TEXT NOT NULL,

    lesson_count INTEGER NOT NULL
    CHECK (lesson_count > 0),

    lesson_duration_minutes INTEGER NOT NULL
    CHECK (lesson_duration_minutes > 0),

    base_price NUMERIC(12,2) NOT NULL
    CHECK (base_price >= 0),

    service_mode TEXT NOT NULL
    CHECK (
      service_mode IN (
        'doorstep',
        'pickup_point',
        'hybrid'
      )
    ),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL

);

CREATE INDEX idx_package_projection_active
ON package_projection(is_active);


INSERT INTO aggregate_governance_rule (

    aggregate_type,
    birth_event_type,
    allow_pre_birth_events

)
VALUES (

    'package',
    'package_created',
    FALSE

)
ON CONFLICT DO NOTHING;


INSERT INTO projection_checkpoint (

    projection_name,
    last_processed_sequence,
    replay_completed,
    updated_at

)
VALUES (

    'package_projection',
    0,
    FALSE,
    NOW()

)
ON CONFLICT DO NOTHING;
