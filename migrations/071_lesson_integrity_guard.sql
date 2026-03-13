CREATE OR REPLACE FUNCTION validate_lesson_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  started_count INT;
  confirmed_count INT;
BEGIN

  -- Only guard lesson lifecycle events
  IF NEW.event_type NOT IN (
    'lesson_started',
    'lesson_completed'
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if lesson_confirmed exists
  SELECT COUNT(*) INTO confirmed_count
  FROM event
  WHERE identity_id = NEW.identity_id
  AND event_type = 'lesson_confirmed';

  IF confirmed_count = 0 THEN
    RAISE EXCEPTION
      'Lesson cannot progress without lesson_confirmed';
  END IF;

  -- Prevent double lesson_started
  IF NEW.event_type = 'lesson_started' THEN

    SELECT COUNT(*) INTO started_count
    FROM event
    WHERE identity_id = NEW.identity_id
    AND event_type = 'lesson_started';

    IF started_count > 0 THEN
      RAISE EXCEPTION
        'Lesson already started';
    END IF;

  END IF;

  -- lesson_completed requires lesson_started
  IF NEW.event_type = 'lesson_completed' THEN

    SELECT COUNT(*) INTO started_count
    FROM event
    WHERE identity_id = NEW.identity_id
    AND event_type = 'lesson_started';

    IF started_count = 0 THEN
      RAISE EXCEPTION
        'Lesson cannot complete before starting';
    END IF;

  END IF;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS lesson_lifecycle_guard ON event;

CREATE TRIGGER lesson_lifecycle_guard
BEFORE INSERT ON event
FOR EACH ROW
EXECUTE FUNCTION validate_lesson_lifecycle();
