CREATE INDEX idx_instructor_offer_stats_fairness
ON instructor_offer_stats (offers_last_24h ASC, last_offer_at ASC);
