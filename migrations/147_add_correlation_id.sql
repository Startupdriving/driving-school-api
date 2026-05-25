ALTER TABLE event
ADD COLUMN correlation_id UUID;

ALTER TABLE event
ADD COLUMN causation_id UUID;

CREATE INDEX idx_event_correlation_id
ON event(correlation_id);

CREATE INDEX idx_event_causation_id
ON event(causation_id);
