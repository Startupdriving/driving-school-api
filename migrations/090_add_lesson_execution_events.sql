-- Allow lesson lifecycle events for lesson identity

INSERT INTO event_type_identity_map (identity_type, event_type)
VALUES
  ('lesson', 'lesson_created'),
  ('lesson', 'lesson_started'),
  ('lesson', 'lesson_completed')
ON CONFLICT DO NOTHING;
