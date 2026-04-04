CREATE VIEW instructor_dashboard_projection AS
SELECT

  i.id AS instructor_id,

  -- pending offers
  (
    SELECT COUNT(*)
    FROM instructor_pending_offers ipo
    WHERE ipo.instructor_id = i.id
  ) AS pending_offers,

  -- ✅ REAL lesson_id (NOT lesson_request_id)
  (
    SELECT e.identity_id
    FROM event e
    WHERE e.event_type = 'lesson_created'
    AND e.instructor_id = i.id

    AND (e.payload->>'lesson_request_id')::uuid IN (
      SELECT lt.lesson_request_id
      FROM lesson_timeline_projection lt
      WHERE lt.instructor_id = i.id
      AND lt.completed_at IS NULL
      AND lt.cancelled_at IS NULL
    )

    LIMIT 1
  ) AS active_lesson_id,

  -- upcoming lessons
  (
    SELECT COUNT(*)
    FROM lesson_timeline_projection lt
    WHERE lt.instructor_id = i.id
    AND lt.confirmed_at IS NOT NULL
    AND lt.started_at IS NULL
  ) AS upcoming_lessons,

  COALESCE(ie.instructor_earnings_total,0) AS total_earnings,

  z.zone_name AS current_zone

FROM identity i

LEFT JOIN instructor_earnings_projection ie
ON ie.instructor_id = i.id

LEFT JOIN instructor_current_zone icz
ON icz.instructor_id = i.id

LEFT JOIN geo_zones z
ON z.id = icz.zone_id

WHERE i.identity_type = 'instructor';
