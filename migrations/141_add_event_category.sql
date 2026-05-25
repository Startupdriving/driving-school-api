ALTER TABLE event
ADD COLUMN event_category TEXT;

UPDATE event
SET event_category = CASE

  /* =====================================================
     AUTHORITATIVE DOMAIN AGGREGATES
  ===================================================== */

  WHEN event_type IN (
    'lesson_created',
    'lesson_started',
    'lesson_completed',
    'lesson_cancelled',
    'lesson_rescheduled',
    'lesson_reschedule_requested',
    'lesson_reschedule_accepted',
    'lesson_reschedule_rejected'
  )
  THEN 'aggregate'

  WHEN event_type IN (
    'student_created',
    'student_updated'
  )
  THEN 'aggregate'

  WHEN event_type IN (
    'instructor_created',
    'instructor_updated'
  )
  THEN 'aggregate'


  /* =====================================================
     DISPATCH / WORKFLOW ORCHESTRATION
  ===================================================== */

  WHEN event_type IN (
    'lesson_requested',
    'lesson_request_dispatch_started',
    'lesson_request_wave_completed',
    'lesson_request_expired'
  )
  THEN 'orchestration'

  WHEN event_type IN (
    'lesson_offer_sent',
    'lesson_offer_countered',
    'lesson_offer_accepted',
    'lesson_offer_rejected'
  )
  THEN 'orchestration'


  /* =====================================================
     RUNTIME OPERATIONAL SIGNALS
  ===================================================== */

  WHEN event_type IN (
    'instructor_online',
    'instructor_offline',
    'instructor_location_updated'
  )
  THEN 'runtime'


  /* =====================================================
     FALLBACK
  ===================================================== */

  ELSE 'system'

END;

CREATE INDEX idx_event_category
ON event(event_category);
