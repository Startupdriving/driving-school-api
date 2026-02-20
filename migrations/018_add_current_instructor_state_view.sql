-- ============================================
-- MIGRATION 018
-- Current Instructor State Projection
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_instructor_state AS
SELECT DISTINCT ON (identity_id)
    identity_id AS instructor_id,
    event_type AS state,
    created_at
FROM event
WHERE event_type IN (
    'instructor_online',
    'instructor_offline',
    'instructor_paused',
    'instructor_resumed'
)
ORDER BY identity_id, created_at DESC;

COMMIT;
