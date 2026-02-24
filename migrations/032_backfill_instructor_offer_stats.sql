INSERT INTO instructor_offer_stats (
    instructor_id,
    offers_last_24h,
    confirmed_last_24h,
    last_offer_at
)
SELECT
    (payload->>'instructor_id')::uuid,
    COUNT(*) FILTER (
        WHERE event_type = 'lesson_offer_sent'
        AND created_at > NOW() - INTERVAL '24 hours'
    ),
    COUNT(*) FILTER (
        WHERE event_type = 'lesson_confirmed'
        AND created_at > NOW() - INTERVAL '24 hours'
    ),
    MAX(created_at) FILTER (
        WHERE event_type = 'lesson_offer_sent'
    )
FROM event
WHERE event_type IN ('lesson_offer_sent', 'lesson_confirmed')
GROUP BY (payload->>'instructor_id');
