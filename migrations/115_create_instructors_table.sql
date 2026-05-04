CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name TEXT NOT NULL,
    mobile_number TEXT UNIQUE NOT NULL,

    gender TEXT,
    date_of_birth DATE,

    cnic TEXT,
    license_number TEXT,

    car_model TEXT,
    transmission_type TEXT,

    zone TEXT,

    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,

    status TEXT NOT NULL DEFAULT 'pending',

    is_verified BOOLEAN NOT NULL DEFAULT false,
    documents_verified BOOLEAN NOT NULL DEFAULT false,

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instructors_mobile
ON instructors(mobile_number);

CREATE INDEX idx_instructors_status
ON instructors(status);

CREATE INDEX idx_instructors_zone
ON instructors(zone);
