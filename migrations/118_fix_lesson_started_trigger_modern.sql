BEGIN;

DROP TRIGGER IF EXISTS enforce_lesson_event_sequence_trigger ON event;
DROP FUNCTION IF EXISTS enforce_lesson_event_sequence() CASCADE;

CREATE OR REPLACE FUNCTION enforce_lesson_event_sequence()
RETURNS TRIGGER AS $$
BEGIN

  -- lesson_started requires lesson_created on same lesson identity
  IF NEW.event_type = 'lesson_started' THEN

    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = NEW.identity_id
        AND event_type = 'lesson_created'
    ) THEN
      RAISE EXCEPTION 'lesson_started requires lesson_created first';
    END IF;

  END IF;

  -- lesson_completed requires lesson_started first
  IF NEW.event_type = 'lesson_completed' THEN

    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = NEW.identity_id
        AND event_type = 'lesson_started'
    ) THEN
      RAISE EXCEPTION 'lesson_completed requires lesson_started first';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_lesson_event_sequence_trigger
BEFORE INSERT ON event
FOR EACH ROW
EXECUTE FUNCTION enforce_lesson_event_sequence();

INSERT INTO schema_version(version)
VALUES (118)
ON CONFLICT (version) DO NOTHING;

COMMIT;
