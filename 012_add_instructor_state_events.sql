-- ============================================
-- MIGRATION 012
-- Add Instructor Dynamic State Events
-- ============================================

BEGIN;

INSERT INTO identity_event_rule (identity_type, event_type) VALUES
('instructor', 'instructor_online'),
('instructor', 'instructor_offline'),
('instructor', 'instructor_paused'),
('instructor', 'instructor_resumed');

COMMIT;
