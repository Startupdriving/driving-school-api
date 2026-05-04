CREATE TABLE IF NOT EXISTS student_profile_projection (
  student_id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructor_profile_projection (
  instructor_id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
