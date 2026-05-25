ALTER TABLE event
ADD COLUMN processed BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_event_unprocessed
ON event (processed)
WHERE processed = FALSE;
