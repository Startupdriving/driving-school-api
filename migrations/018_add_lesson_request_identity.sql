-- =====================================================
-- MIGRATION 018
-- Add lesson_request identity and lifecycle rules
-- =====================================================

-- 1️⃣ Register new identity type rule mappings

INSERT INTO identity_event_rule (identity_type, event_type) VALUES
('lesson_request', 'lesson_requested'),
('lesson_request', 'lesson_offer_sent'),
('lesson_request', 'lesson_offer_accepted'),
('lesson_request', 'lesson_offer_rejected'),
('lesson_request', 'lesson_request_expired'),
('lesson_request', 'lesson_confirmed');


-- 2️⃣ Optional: Add index for faster request lookups

CREATE INDEX IF NOT EXISTS idx_event_lesson_request_type
ON event (identity_id, event_type)
WHERE event_type IN (
  'lesson_requested',
  'lesson_offer_sent',
  'lesson_offer_accepted',
  'lesson_offer_rejected',
  'lesson_request_expired',
  'lesson_confirmed'
);
