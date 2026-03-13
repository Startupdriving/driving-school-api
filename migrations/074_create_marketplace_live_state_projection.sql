CREATE OR REPLACE VIEW marketplace_live_state_projection AS
SELECT

-- lesson requests waiting for acceptance
(
  SELECT COUNT(*)
  FROM event e
  WHERE e.event_type = 'lesson_requested'
  AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
    AND e2.event_type IN (
      'lesson_offer_accepted',
      'lesson_request_expired'
    )
  )
) AS active_lesson_requests,

-- lessons currently running
(
  SELECT COUNT(*)
  FROM event e
  WHERE e.event_type = 'lesson_started'
  AND NOT EXISTS (
    SELECT 1
    FROM event e2
    WHERE e2.identity_id = e.identity_id
    AND e2.event_type = 'lesson_completed'
  )
) AS active_lessons,

-- upcoming confirmed lessons
(
  SELECT COUNT(*)
  FROM event e
  WHERE e.event_type = 'lesson_confirmed'
) AS upcoming_lessons,

-- instructors online
(
  SELECT COUNT(*)
  FROM current_online_instructors
) AS online_instructors,

-- pending instructor offers
(
  SELECT COUNT(*)
  FROM instructor_pending_offers
) AS pending_offers,

NOW() AS snapshot_time;
