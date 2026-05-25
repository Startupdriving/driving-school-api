INSERT INTO identity_event_rule (
  identity_type,
  event_type
)
VALUES
  ('lesson', 'lesson_rescheduled'),

  ('lesson', 'lesson_reschedule_requested'),

  ('lesson', 'lesson_reschedule_accepted'),

  ('lesson', 'lesson_reschedule_rejected')

ON CONFLICT DO NOTHING;
