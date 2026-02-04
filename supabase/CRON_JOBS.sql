-- ===================================================================
-- ELIX STAR MVP - CRON JOBS (Scheduled Tasks)
-- Run this AFTER ALL_NEW_FEATURES.sql and SECURITY_POLICIES.sql
-- Requires pg_cron extension (enabled by default on Supabase)
-- ===================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===================================================================
-- 1. UPDATE TRENDING SCORES (Every 5 minutes)
-- ===================================================================

SELECT cron.schedule(
    'update-trending-scores',
    '*/5 * * * *', -- Every 5 minutes
    $$SELECT update_trending_scores();$$
);

-- ===================================================================
-- 2. CLEAN EXPIRED BOOSTERS (Every hour)
-- ===================================================================

SELECT cron.schedule(
    'clean-expired-boosters',
    '0 * * * *', -- Every hour
    $$
    UPDATE booster_uses 
    SET status = 'expired' 
    WHERE status = 'active' 
    AND expires_at < NOW();
    $$
);

-- ===================================================================
-- 3. CLEAN EXPIRED COOLDOWNS (Every hour)
-- ===================================================================

SELECT cron.schedule(
    'clean-expired-cooldowns',
    '0 * * * *', -- Every hour
    $$
    DELETE FROM booster_cooldowns 
    WHERE expires_at < NOW();
    $$
);

-- ===================================================================
-- 4. DEACTIVATE EXPIRED BANS (Every 15 minutes)
-- ===================================================================

SELECT cron.schedule(
    'deactivate-expired-bans',
    '*/15 * * * *', -- Every 15 minutes
    $$
    UPDATE user_bans 
    SET is_active = false 
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    $$
);

-- ===================================================================
-- 5. UPDATE HASHTAG TRENDING (Every 10 minutes)
-- ===================================================================

SELECT cron.schedule(
    'update-hashtag-trending',
    '*/10 * * * *', -- Every 10 minutes
    $$
    UPDATE hashtags 
    SET trending_score = (
        SELECT COUNT(*) * 1.0
        FROM video_hashtags vh
        JOIN videos v ON v.id = vh.video_id
        WHERE vh.hashtag = hashtags.tag
        AND v.created_at > NOW() - INTERVAL '24 hours'
    );
    $$
);

-- ===================================================================
-- 6. CLEANUP OLD ANALYTICS (Daily at 3 AM)
-- ===================================================================

SELECT cron.schedule(
    'cleanup-old-analytics',
    '0 3 * * *', -- Daily at 3 AM
    $$
    DELETE FROM analytics_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
    $$
);

-- ===================================================================
-- 7. CLEANUP OLD NOTIFICATIONS (Daily at 4 AM)
-- ===================================================================

SELECT cron.schedule(
    'cleanup-old-notifications',
    '0 4 * * *', -- Daily at 4 AM
    $$
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_read = true;
    $$
);

-- ===================================================================
-- VIEW ALL CRON JOBS
-- ===================================================================

-- Run this to see all scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('job-name');

-- ===================================================================
-- ✅ DONE! All cron jobs scheduled!
-- ===================================================================
