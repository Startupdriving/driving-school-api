ALTER TABLE event
ADD COLUMN aggregate_type TEXT;

UPDATE event
SET aggregate_type = CASE

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
  THEN 'lesson'

  WHEN event_type IN (
    'lesson_requested',
    'lesson_request_dispatch_started',
    'lesson_request_wave_completed',
    'lesson_request_expired'
  )
  THEN 'lesson_request'

  WHEN event_type IN (
    'lesson_offer_sent',
    'lesson_offer_accepted',
    'lesson_offer_rejected',
    'lesson_offer_countered'
  )
  THEN 'lesson_offer'

  WHEN event_type LIKE 'student_%'
  THEN 'student'

  WHEN event_type LIKE 'instructor_%'
  THEN 'instructor'

  ELSE 'system'

END;

CREATE INDEX idx_event_aggregate_type
ON event(aggregate_type);
