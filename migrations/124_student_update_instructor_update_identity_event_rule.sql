INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
('student', 'student_updated'),
('instructor', 'instructor_updated')
ON CONFLICT DO NOTHING;
