CREATE TABLE IF NOT EXISTS active_lessons_map_projection (

  lesson_id uuid PRIMARY KEY,

  student_lat numeric NOT NULL,
  student_lng numeric NOT NULL,

  instructor_lat numeric NOT NULL,
  instructor_lng numeric NOT NULL,

  updated_at timestamptz DEFAULT NOW()

);
