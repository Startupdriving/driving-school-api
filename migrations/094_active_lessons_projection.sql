CREATE TABLE active_lessons_projection (
  lesson_id UUID PRIMARY KEY,
  lesson_request_id UUID,
  instructor_id UUID,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
