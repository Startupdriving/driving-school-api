-- STEP 1: DROP WRONG VIEW
DROP VIEW IF EXISTS student_active_lesson_projection;

-- STEP 2: CREATE CORRECT TABLE
CREATE TABLE student_active_lesson_projection (
  student_id UUID PRIMARY KEY,

  lesson_request_id UUID,
  lesson_id UUID,

  status TEXT,

  instructor_id UUID,

  requested_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  updated_at TIMESTAMP DEFAULT NOW()
);
