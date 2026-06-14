INSERT INTO aggregate_governance_rule (
  aggregate_type,
  birth_event_type,
  allow_pre_birth_events,
  created_at
)
VALUES (
  'enrollment',
  'enrollment_created',
  FALSE,
  NOW()
);
