-- ============================================
-- MIGRATION 017
-- Enforce Instructor Dynamic State Rules
-- ============================================

BEGIN;

INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('instructor', 'instructor_online'),
('instructor', 'instructor_offline'),
('instructor', 'instructor_paused'),
('instructor', 'instructor_resumed')
ON CONFLICT DO NOTHING;

INSERT INTO schema_version(version, applied_at)
VALUES (17, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
