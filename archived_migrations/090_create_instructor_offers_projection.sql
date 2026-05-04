-- 090_create_instructor_offers_projection.sql

CREATE TABLE IF NOT EXISTS instructor_offers_projection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  instructor_id UUID NOT NULL,
  lesson_request_id UUID NOT NULL,

  status TEXT DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_instructor_offers_instructor
ON instructor_offers_projection(instructor_id);

-- Optional: prevent duplicate offers
CREATE UNIQUE INDEX IF NOT EXISTS uniq_instructor_request
ON instructor_offers_projection(instructor_id, lesson_request_id);
