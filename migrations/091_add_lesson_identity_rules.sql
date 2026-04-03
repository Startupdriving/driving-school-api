-- 🥇 Add lesson execution rules

INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
  ('lesson', 'lesson_created'),
  ('lesson', 'lesson_started'),
  ('lesson', 'lesson_completed')
ON CONFLICT DO NOTHING;
