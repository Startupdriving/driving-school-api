CREATE TABLE IF NOT EXISTS lesson_offer_negotiation_projection (

  offer_id UUID PRIMARY KEY,

  lesson_request_id UUID NOT NULL,

  instructor_id UUID NOT NULL,
  student_id UUID NOT NULL,

  status TEXT CHECK (
    status IN ('sent', 'countered', 'accepted', 'rejected', 'expired')
  ),

  last_response_by TEXT CHECK (
    last_response_by IN ('student', 'instructor')
  ),

  -- ORIGINAL TERMS (snapshot at dispatch)
  original_start_time TIMESTAMPTZ,
  original_end_time TIMESTAMPTZ,
  original_price INTEGER,

  -- CURRENT NEGOTIATED TERMS
  proposed_start_time TIMESTAMPTZ,
  proposed_end_time TIMESTAMPTZ,
  proposed_price INTEGER,

  response_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);




CREATE INDEX IF NOT EXISTS idx_offer_neg_request
ON lesson_offer_negotiation_projection (lesson_request_id);

CREATE INDEX IF NOT EXISTS idx_offer_neg_instructor
ON lesson_offer_negotiation_projection (instructor_id);
