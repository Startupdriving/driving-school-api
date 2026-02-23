-- ============================================
-- Payment Lifecycle Rules
-- ============================================

INSERT INTO identity_event_rule (identity_type, event_type)
VALUES
  ('lesson', 'lesson_price_calculated'),

  ('payment', 'payment_created'),
  ('payment', 'payment_requested'),
  ('payment', 'payment_confirmed'),
  ('payment', 'commission_calculated'),
  ('payment', 'payout_completed');
