-- =====================================================
-- 221_add_reschedule_events_to_identity_guard.sql
-- Allow reschedule lifecycle events for lesson identity
-- =====================================================

BEGIN;

INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('lesson', 'lesson_reschedule_requested'),
('lesson', 'lesson_reschedule_accepted'),
('lesson', 'lesson_reschedule_rejected'),
('lesson', 'lesson_reschedule_expired')
ON CONFLICT (identity_type, event_type) DO NOTHING;

INSERT INTO schema_version (version)
VALUES (221)
ON CONFLICT (version) DO NOTHING;

COMMIT;
