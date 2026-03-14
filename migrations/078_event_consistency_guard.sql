CREATE OR REPLACE FUNCTION enforce_lesson_event_sequence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_event TEXT;
BEGIN

  SELECT event_type
  INTO last_event
  FROM event
  WHERE identity_id = NEW.identity_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NEW.event_type = 'lesson_started' AND last_event <> 'lesson_confirmed' THEN
    RAISE EXCEPTION 'lesson_started requires lesson_confirmed first';
  END IF;

  IF NEW.event_type = 'lesson_completed' AND last_event <> 'lesson_started' THEN
    RAISE EXCEPTION 'lesson_completed requires lesson_started first';
  END IF;

  IF NEW.event_type = 'lesson_offer_sent' AND last_event = 'lesson_confirmed' THEN
    RAISE EXCEPTION 'offers cannot be sent after lesson_confirmed';
  END IF;

  RETURN NEW;

END;
$$;

CREATE TRIGGER lesson_event_sequence_guard
BEFORE INSERT ON event
FOR EACH ROW
WHEN (NEW.identity_id IS NOT NULL)
EXECUTE FUNCTION enforce_lesson_event_sequence();
