CREATE TABLE IF NOT EXISTS instructor_pending_offers (
    offer_id UUID PRIMARY KEY,
    instructor_id UUID NOT NULL,
    lesson_request_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_offers_instructor
ON instructor_pending_offers(instructor_id);
