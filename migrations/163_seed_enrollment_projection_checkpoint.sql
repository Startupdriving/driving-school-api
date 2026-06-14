INSERT INTO projection_checkpoint (
  projection_name,
  last_processed_sequence
)
VALUES (
  'enrollment_projection',
  0
)
ON CONFLICT (projection_name)
DO NOTHING;
