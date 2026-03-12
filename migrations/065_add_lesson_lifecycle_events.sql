-- 065_add_lesson_lifecycle_events.sql
-- Adds lifecycle events for lesson_request identity

INSERT INTO identity_event_rule (identity_type, event_type)
VALUES 
('lesson_request','lesson_started'),
('lesson_request','lesson_completed'),
('lesson_request','lesson_cancelled')
ON CONFLICT DO NOTHING;
