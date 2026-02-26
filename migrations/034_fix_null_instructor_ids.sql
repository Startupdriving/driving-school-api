-- 1️⃣ Repair historical corrupted lesson_offer_sent rows

UPDATE event
SET instructor_id = (payload->>'instructor_id')::uuid
WHERE event_type = 'lesson_offer_sent'
AND instructor_id IS NULL
AND payload ? 'instructor_id';

-- 2️⃣ Add structural protection so this never happens again

ALTER TABLE event
ADD CONSTRAINT lesson_offer_sent_requires_instructor
CHECK (
  event_type <> 'lesson_offer_sent'
  OR instructor_id IS NOT NULL
);
