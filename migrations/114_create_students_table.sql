CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    mobile_number TEXT UNIQUE NOT NULL,
    age INTEGER,
    city TEXT,
    preferred_language TEXT,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_mobile_number
ON students(mobile_number);

CREATE INDEX idx_students_status
ON students(status);
