CREATE TABLE instructor_offer_stats (
    instructor_id UUID PRIMARY KEY,
    offers_last_24h INTEGER NOT NULL DEFAULT 0,
    confirmed_last_24h INTEGER NOT NULL DEFAULT 0,
    last_offer_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
