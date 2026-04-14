-- 103_create_lesson_negotiation_projection.sql

CREATE TABLE IF NOT EXISTS lesson_negotiation_projection (

  lesson_request_id UUID PRIMARY KEY,

  student_id UUID,
  instructor_id UUID,

  status TEXT CHECK (
    status IN ('pending', 'countered', 'accepted', 'rejected', 'expired')
  ),

  last_response_by TEXT CHECK (
    last_response_by IN ('student', 'instructor')
  ),

  -- ORIGINAL TERMS (immutable)
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
