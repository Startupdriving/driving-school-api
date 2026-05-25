ALTER TABLE dead_letter_event
ADD CONSTRAINT unique_original_event
UNIQUE (original_event_id);
