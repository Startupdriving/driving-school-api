-- =====================================================
-- ENTERPRISE RESCHEDULE SYSTEM
-- Production Migration
-- Safe / Idempotent Style
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS lesson_reschedule_projection (
  lesson_id UUID PRIMARY KEY,

  requested_by TEXT NOT NULL
    CHECK (requested_by IN ('student','instructor','admin')),

  requested_by_id UUID,

  current_start_time TIMESTAMPTZ NOT NULL,
  current_end_time   TIMESTAMPTZ NOT NULL,

  proposed_start_time TIMESTAMPTZ NOT NULL,
  proposed_end_time   TIMESTAMPTZ NOT NULL,

  reason TEXT,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'pending',
        'accepted',
        'rejected',
        'expired',
        'cancelled'
      )
    ),

  response_by TEXT
    CHECK (response_by IN ('student','instructor','admin')),

  responded_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_reschedule_time
    CHECK (proposed_end_time > proposed_start_time)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_status
ON lesson_reschedule_projection(status);

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_expires
ON lesson_reschedule_projection(expires_at);

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_requested_by_id
ON lesson_reschedule_projection(requested_by_id);

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_proposed_start
ON lesson_reschedule_projection(proposed_start_time);

-- =====================================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION set_lesson_reschedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. DROP + RECREATE TRIGGER SAFELY
-- =====================================================

DROP TRIGGER IF EXISTS trg_lesson_reschedule_updated_at
ON lesson_reschedule_projection;

CREATE TRIGGER trg_lesson_reschedule_updated_at
BEFORE UPDATE ON lesson_reschedule_projection
FOR EACH ROW
EXECUTE FUNCTION set_lesson_reschedule_updated_at();

COMMIT;
