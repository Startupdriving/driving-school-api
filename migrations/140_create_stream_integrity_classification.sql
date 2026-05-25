CREATE OR REPLACE VIEW stream_integrity_classification AS

SELECT
  s.*,

  CASE

    -- impossible lifecycle corruption
    WHEN
      s.aggregate_type = 'lesson_offer'
      AND s.event_type = 'lesson_offer_accepted'
      AND s.violation_type = 'pre_birth_event'
    THEN 'HARD_CORRUPTION'

    WHEN
      s.aggregate_type = 'lesson'
      AND s.violation_type = 'pre_birth_event'
    THEN 'HARD_CORRUPTION'

    -- legacy runtime evolution
    WHEN
      s.aggregate_type = 'instructor'
      AND s.event_type IN (
        'instructor_online',
        'instructor_offline',
        'instructor_location_updated'
      )
    THEN 'LEGACY_MIGRATION'

    -- unknown governance mapping
    WHEN
      s.aggregate_type = 'system'
    THEN 'GOVERNANCE_GAP'

    -- missing birth streams
    WHEN
      s.violation_type = 'missing_birth_event'
    THEN 'ORPHAN_STREAM'

    ELSE 'UNKNOWN'

  END AS severity_class

FROM stream_integrity_projection s;
