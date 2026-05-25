CREATE TABLE instructor_reliability_projection (
  instructor_id UUID PRIMARY KEY,

  completed_lessons INTEGER DEFAULT 0,
  cancelled_lessons INTEGER DEFAULT 0,

  completed_after_start INTEGER DEFAULT 0,

  reschedules_requested INTEGER DEFAULT 0,
  reschedules_accepted INTEGER DEFAULT 0,
  reschedules_rejected INTEGER DEFAULT 0,

  reliability_score NUMERIC DEFAULT 100,

  updated_at TIMESTAMP DEFAULT NOW()
);
