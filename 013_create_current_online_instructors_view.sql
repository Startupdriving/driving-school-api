-- ============================================
-- MIGRATION 013
-- Current Online Instructors View
-- ============================================

BEGIN;

CREATE OR REPLACE VIEW current_online_instructors AS
SELECT i.id
FROM identity i
WHERE i.identity_type = 'instructor'
AND EXISTS (
    SELECT 1
    FROM event e_online
    WHERE e_online.identity_id = i.id
      AND e_online.event_type = 'instructor_online'
)
AND NOT EXISTS (
    SELECT 1
    FROM event e_off
    WHERE e_off.identity_id = i.id
      AND e_off.event_type IN ('instructor_offline', 'instructor_paused')
      AND e_off.created_at > (
          SELECT MAX(e2.created_at)
          FROM event e2
          WHERE e2.identity_id = i.id
            AND e2.event_type = 'instructor_online'
      )
);

COMMIT;
