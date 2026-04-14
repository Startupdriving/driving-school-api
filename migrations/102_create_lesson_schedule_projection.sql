-- 🧠 Create lesson_schedule_projection (authoritative scheduling state)

CREATE TABLE lesson_schedule_projection (
  lesson_request_id UUID PRIMARY KEY,

  instructor_id UUID NOT NULL,
  student_id UUID NOT NULL,

  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('confirmed', 'started', 'completed', 'cancelled')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🧱 Index for overlap detection (critical for scheduling checks)
CREATE INDEX idx_lesson_schedule_instructor_time
ON lesson_schedule_projection (instructor_id, start_time, end_time);
