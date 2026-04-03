-- 🔥 DROP OLD FUNCTION
DROP FUNCTION IF EXISTS validate_lesson_lifecycle() CASCADE;

-- 🔥 CREATE NEW FUNCTION
CREATE OR REPLACE FUNCTION validate_lesson_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  request_id UUID;
BEGIN

  -- 🚨 Only validate lesson_started
  IF NEW.event_type = 'lesson_started' THEN

    -- 1️⃣ Get lesson_request_id from lesson_created
    SELECT (payload->>'lesson_request_id')::uuid
    INTO request_id
    FROM event
    WHERE identity_id = NEW.identity_id
      AND event_type = 'lesson_created'
    LIMIT 1;

    IF request_id IS NULL THEN
      RAISE EXCEPTION 'Lesson must have lesson_created first';
    END IF;

    -- 2️⃣ Check confirmation on lesson_request
    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = request_id
        AND event_type = 'lesson_confirmed'
    ) THEN
      RAISE EXCEPTION 'Lesson cannot progress without lesson_confirmed';
    END IF;

  END IF;


IF NEW.event_type = 'lesson_cancelled' THEN

  -- ❌ cannot cancel after completed
  IF EXISTS (
    SELECT 1
    FROM event
    WHERE identity_id = NEW.identity_id
      AND event_type = 'lesson_completed'
  ) THEN
    RAISE EXCEPTION 'Cannot cancel completed lesson';
  END IF;

END IF;



  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔥 RE-ATTACH TRIGGER
DROP TRIGGER IF EXISTS validate_lesson_lifecycle_trigger ON event;

CREATE TRIGGER validate_lesson_lifecycle_trigger
BEFORE INSERT ON event
FOR EACH ROW
EXECUTE FUNCTION validate_lesson_lifecycle();
