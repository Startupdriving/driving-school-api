ALTER TABLE event
ADD COLUMN stream_version INTEGER;


WITH ranked AS (

  SELECT
    sequence_number,
    ROW_NUMBER() OVER (
      PARTITION BY identity_id
      ORDER BY sequence_number
    ) AS version_number

  FROM event

)

UPDATE event e
SET stream_version = ranked.version_number
FROM ranked
WHERE e.sequence_number =
      ranked.sequence_number;


ALTER TABLE event
ALTER COLUMN stream_version
SET NOT NULL;


CREATE UNIQUE INDEX
unique_stream_version
ON event (
  identity_id,
  stream_version
);
