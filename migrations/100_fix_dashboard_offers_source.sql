CREATE OR REPLACE VIEW instructor_dashboard_projection AS
SELECT

  i.id AS instructor_id,

  -- pending offers (FIXED)
  (
    SELECT COUNT(*)
    FROM instructor_offers_projection iop
    WHERE iop.instructor_id = i.id
  ) AS pending_offers,

  -- active lesson (unchanged)
  (
    SELECT lt.lesson_request_id
    FROM lesson_timeline_projection lt
    WHERE lt.instructor_id = i.id
    AND lt.started_at IS NOT NULL
    AND lt.completed_at IS NULL
    AND lt.cancelled_at IS NULL
    LIMIT 1
  ) AS active_lesson_id,

  -- upcoming lessons
  (
    SELECT COUNT(*)
    FROM lesson_timeline_projection lt
    WHERE lt.instructor_id = i.id
    AND lt.confirmed_at IS NOT NULL
    AND lt.started_at IS NULL
  ) AS upcoming_lessons

FROM identity i
WHERE i.identity_type = 'instructor';
