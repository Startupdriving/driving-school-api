-- 🔥 DROP OLD TRIGGER FUNCTION
DROP FUNCTION IF EXISTS enforce_lesson_event_sequence() CASCADE;

-- 🔥 CREATE NEW FUNCTION
CREATE OR REPLACE FUNCTION enforce_lesson_event_sequence()
RETURNS TRIGGER AS $$
DECLARE
  request_id UUID;
BEGIN

  -- 🚨 ONLY HANDLE lesson_started
  IF NEW.event_type = 'lesson_started' THEN

    -- 1️⃣ Get lesson_request_id from lesson_created
    SELECT (payload->>'lesson_request_id')::uuid
    INTO request_id
    FROM event
    WHERE identity_id = NEW.identity_id
      AND event_type = 'lesson_created'
    LIMIT 1;

    -- ❌ If no mapping found
    IF request_id IS NULL THEN
      RAISE EXCEPTION 'lesson_started requires lesson_created first';
    END IF;

    -- 2️⃣ Check if request is confirmed
    IF NOT EXISTS (
      SELECT 1
      FROM event
      WHERE identity_id = request_id
        AND event_type = 'lesson_confirmed'
    ) THEN
      RAISE EXCEPTION 'lesson_started requires lesson_confirmed first';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔥 RE-ATTACH TRIGGER
DROP TRIGGER IF EXISTS enforce_lesson_event_sequence_trigger ON event;

CREATE TRIGGER enforce_lesson_event_sequence_trigger
BEFORE INSERT ON event
FOR EACH ROW
EXECUTE FUNCTION enforce_lesson_event_sequence();
