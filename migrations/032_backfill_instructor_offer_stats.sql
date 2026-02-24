INSERT INTO instructor_offer_stats (
    instructor_id,
    offers_last_24h,
    confirmed_last_24h,
    last_offer_at
)
SELECT
    instructor_id,
    COUNT(*) FILTER (
        WHERE event_type = 'lesson_offer_sent'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) AS offers_last_24h,
    COUNT(*) FILTER (
        WHERE event_type = 'lesson_confirmed'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) AS confirmed_last_24h,
    MAX(created_at) FILTER (
        WHERE event_type = 'lesson_offer_sent'
    ) AS last_offer_at
FROM event
WHERE event_type IN ('lesson_offer_sent', 'lesson_confirmed')
AND instructor_id IS NOT NULL
GROUP BY instructor_id;
