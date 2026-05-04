BEGIN;

DROP TRIGGER IF EXISTS validate_lesson_lifecycle_trigger ON event;
DROP FUNCTION IF EXISTS validate_lesson_lifecycle() CASCADE;

CREATE OR REPLACE FUNCTION validate_lesson_lifecycle()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.event_type = 'lesson_started' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = NEW.identity_id
        AND event_type = 'lesson_created'
    ) THEN
      RAISE EXCEPTION 'Lesson must have lesson_created first';
    END IF;
  END IF;

  IF NEW.event_type = 'lesson_completed' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = NEW.identity_id
        AND event_type = 'lesson_started'
    ) THEN
      RAISE EXCEPTION 'Lesson must have lesson_started first';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_lesson_lifecycle_trigger
BEFORE INSERT ON event
FOR EACH ROW
EXECUTE FUNCTION validate_lesson_lifecycle();

INSERT INTO schema_version(version)
VALUES (119)
ON CONFLICT (version) DO NOTHING;

COMMIT;
