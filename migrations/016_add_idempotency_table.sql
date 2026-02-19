-- ============================================
-- MIGRATION 016
-- Add Idempotency Key Table
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS idempotency_key (
    key TEXT PRIMARY KEY,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
ON idempotency_key(created_at);

INSERT INTO schema_version(version, applied_at)
VALUES (16, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
