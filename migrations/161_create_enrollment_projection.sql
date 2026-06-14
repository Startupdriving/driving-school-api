CREATE TABLE enrollment_projection (

  enrollment_id UUID PRIMARY KEY,

  student_id UUID NOT NULL,

  package_id UUID NOT NULL,

  status TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL,

  updated_at TIMESTAMPTZ NOT NULL

);
