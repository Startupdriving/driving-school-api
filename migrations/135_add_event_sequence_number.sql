ALTER TABLE event
ADD COLUMN sequence_number BIGSERIAL;

CREATE UNIQUE INDEX idx_event_sequence_number
ON event(sequence_number);
