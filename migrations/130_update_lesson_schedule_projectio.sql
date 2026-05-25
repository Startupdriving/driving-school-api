ALTER TABLE lesson_schedule_projection
ADD COLUMN lesson_id uuid;


UPDATE lesson_schedule_projection
SET lesson_id = lesson_request_id
WHERE lesson_id IS NULL;
