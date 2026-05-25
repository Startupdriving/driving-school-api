CREATE OR REPLACE VIEW stream_integrity_projection AS

WITH aggregate_birth AS (

  SELECT
    e.identity_id,
    e.aggregate_type,
    MIN(e.sequence_number) AS birth_sequence

  FROM event e

  INNER JOIN aggregate_governance_rule g
    ON g.aggregate_type = e.aggregate_type
   AND g.birth_event_type = e.event_type

  GROUP BY
    e.identity_id,
    e.aggregate_type
),

violations AS (

  SELECT
    e.sequence_number,
    e.identity_id,
    e.aggregate_type,
    e.event_type,

    b.birth_sequence,

    CASE

      WHEN b.birth_sequence IS NULL
      THEN 'missing_birth_event'

      WHEN e.sequence_number < b.birth_sequence
      THEN 'pre_birth_event'

      ELSE NULL

    END AS violation_type

  FROM event e

  LEFT JOIN aggregate_birth b
    ON b.identity_id = e.identity_id
   AND b.aggregate_type = e.aggregate_type

)

SELECT *

FROM violations

WHERE violation_type IS NOT NULL

ORDER BY sequence_number ASC;
