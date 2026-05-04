BEGIN;

CREATE OR REPLACE VIEW current_active_instructors AS
SELECT id
FROM instructors
WHERE status = 'active'
  AND is_verified = true;

INSERT INTO schema_version(version, applied_at)
VALUES (117, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
