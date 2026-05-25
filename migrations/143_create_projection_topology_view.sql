CREATE OR REPLACE VIEW projection_topology_view AS

SELECT

  projection_name,

  rebuild_mode,

  authoritative_categories,

  replay_safe,

  allows_runtime_events,

  CASE
    WHEN rebuild_mode = 'deterministic'
    THEN 'authoritative_projection'

    WHEN rebuild_mode = 'orchestration'
    THEN 'workflow_projection'

    WHEN rebuild_mode = 'derived'
    THEN 'derived_projection'

    ELSE 'unknown'
  END AS projection_classification,

  CASE
    WHEN replay_safe = TRUE
    THEN 'replay_safe'

    ELSE 'replay_risk'
  END AS replay_status

FROM projection_governance;
