INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('lesson','lesson_started'),
('lesson','lesson_completed'),
('lesson','lesson_cancelled')
ON CONFLICT DO NOTHING;
