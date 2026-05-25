CREATE TABLE projection_governance (

  projection_name TEXT PRIMARY KEY,

  rebuild_mode TEXT NOT NULL,

  authoritative_categories TEXT[] NOT NULL,

  allows_runtime_events BOOLEAN DEFAULT FALSE,

  replay_safe BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()

);



INSERT INTO projection_governance (
  projection_name,
  rebuild_mode,
  authoritative_categories,
  allows_runtime_events,
  replay_safe
)

VALUES

(
  'lesson_schedule_projection',
  'deterministic',
  ARRAY['aggregate'],
  FALSE,
  TRUE
),

(
  'student_active_lesson_projection',
  'deterministic',
  ARRAY['aggregate'],
  FALSE,
  TRUE
),

(
  'lesson_reschedule_projection',
  'deterministic',
  ARRAY['aggregate'],
  FALSE,
  TRUE
),

(
  'lesson_offer_negotiation_projection',
  'orchestration',
  ARRAY['orchestration'],
  FALSE,
  TRUE
),

(
  'instructor_reliability_projection',
  'derived',
  ARRAY['aggregate'],
  FALSE,
  TRUE
),

(
  'active_lessons_projection',
  'derived',
  ARRAY['aggregate'],
  FALSE,
  TRUE
);
