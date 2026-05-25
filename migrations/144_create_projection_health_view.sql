CREATE OR REPLACE VIEW projection_health_view AS

WITH projection_event_activity AS (

  SELECT

    pg.projection_name,

    pg.projection_classification,

    pg.replay_status,

    MAX(e.sequence_number) AS latest_event_sequence,

    MAX(e.created_at) AS latest_event_time,

    COUNT(*) AS total_events_seen

  FROM projection_topology_view pg

  LEFT JOIN event e
    ON e.event_category = ANY(pg.authoritative_categories)

  GROUP BY
    pg.projection_name,
    pg.projection_classification,
    pg.replay_status
)

SELECT

  projection_name,

  projection_classification,

  replay_status,

  latest_event_sequence,

  latest_event_time,

  total_events_seen,

  NOW() - latest_event_time AS projection_event_lag,

  CASE

    WHEN latest_event_time IS NULL
    THEN 'no_activity'

    WHEN NOW() - latest_event_time > INTERVAL '1 day'
    THEN 'stale'

    ELSE 'healthy'

  END AS health_status

FROM projection_event_activity;
