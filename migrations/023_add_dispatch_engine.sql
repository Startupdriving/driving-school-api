-- ============================================
-- 019_add_dispatch_engine.sql
-- Offer Expiration + Controlled Dispatch Engine
-- ============================================

-- ============================================
-- 1️⃣ Add new whitelist events for lesson_request
-- ============================================

INSERT INTO identity_event_rule (identity_type, event_type) VALUES
('lesson_request', 'lesson_request_dispatch_started'),
('lesson_request', 'lesson_request_wave_completed'),
('lesson_request', 'lesson_request_expired')
ON CONFLICT (identity_type, event_type) DO NOTHING;


-- ============================================
-- 2️⃣ Unique Wave Safety Indexes
-- Prevent duplicate wave start or completion
-- ============================================

CREATE UNIQUE INDEX unique_dispatch_started_per_wave
ON event (identity_id, ((payload->>'wave')::int))
WHERE event_type = 'lesson_request_dispatch_started';


CREATE UNIQUE INDEX unique_wave_completed_per_wave
ON event (identity_id, ((payload->>'wave')::int))
WHERE event_type = 'lesson_request_wave_completed';


-- ============================================
-- 3️⃣ Performance Indexes
-- ============================================

CREATE INDEX idx_lesson_request_dispatch_started
ON event (identity_id)
WHERE event_type = 'lesson_request_dispatch_started';

CREATE INDEX idx_lesson_request_wave_completed
ON event (identity_id)
WHERE event_type = 'lesson_request_wave_completed';

CREATE INDEX idx_lesson_request_expired
ON event (identity_id)
WHERE event_type = 'lesson_request_expired';

CREATE INDEX idx_lesson_confirmed
ON event (identity_id)
WHERE event_type = 'lesson_confirmed';


-- ============================================
-- 4️⃣ View: current_lesson_request_dispatch_state
-- Derives current wave + expiration state
-- ============================================

CREATE VIEW current_lesson_request_dispatch_state AS
WITH dispatch AS (
    SELECT
        e.identity_id,
        e.event_type,
        (e.payload->>'wave')::int AS wave,
        (e.payload->>'expires_at')::timestamptz AS expires_at
    FROM event e
    JOIN identity i ON i.id = e.identity_id
    WHERE i.identity_type = 'lesson_request'
      AND e.event_type IN (
        'lesson_request_dispatch_started',
        'lesson_request_wave_completed',
        'lesson_request_expired',
        'lesson_confirmed'
      )
),
latest_wave AS (
    SELECT
        identity_id,
        MAX(wave) AS current_wave
    FROM dispatch
    WHERE event_type = 'lesson_request_dispatch_started'
    GROUP BY identity_id
)
SELECT
    lw.identity_id AS request_id,
    lw.current_wave,
    ds.expires_at,

    EXISTS (
        SELECT 1 FROM event e2
        WHERE e2.identity_id = lw.identity_id
          AND e2.event_type = 'lesson_confirmed'
    ) AS is_confirmed,

    EXISTS (
        SELECT 1 FROM event e3
        WHERE e3.identity_id = lw.identity_id
          AND e3.event_type = 'lesson_request_expired'
    ) AS is_expired,

    EXISTS (
        SELECT 1 FROM event e4
        WHERE e4.identity_id = lw.identity_id
          AND e4.event_type = 'lesson_request_wave_completed'
          AND (e4.payload->>'wave')::int = lw.current_wave
    ) AS current_wave_completed

FROM latest_wave lw
JOIN dispatch ds
  ON ds.identity_id = lw.identity_id
 AND ds.event_type = 'lesson_request_dispatch_started'
 AND ds.wave = lw.current_wave;


-- ============================================
-- 5️⃣ View: expirable_lesson_requests
-- Used by background worker
-- ============================================

CREATE VIEW expirable_lesson_requests AS
SELECT *
FROM current_lesson_request_dispatch_state
WHERE
    is_confirmed = false
    AND is_expired = false
    AND current_wave_completed = false
    AND expires_at <= NOW();
