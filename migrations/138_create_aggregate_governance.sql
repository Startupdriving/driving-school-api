CREATE TABLE aggregate_governance_rule (

  aggregate_type TEXT PRIMARY KEY,

  birth_event_type TEXT NOT NULL,

  allow_pre_birth_events BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()

);



INSERT INTO aggregate_governance_rule (
  aggregate_type,
  birth_event_type,
  allow_pre_birth_events
)
VALUES

('lesson', 'lesson_created', FALSE),

('lesson_request', 'lesson_requested', FALSE),

('lesson_offer', 'lesson_offer_sent', FALSE),

('student', 'student_created', FALSE),

('instructor', 'instructor_created', FALSE);
