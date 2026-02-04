-- Trending & Discovery System

-- Video interactions (for trending algorithm)
CREATE TABLE IF NOT EXISTS video_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'comment', 'share', 'save', 'not_interested', 'complete_view')),
    watch_duration INTEGER, -- seconds watched
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_video_interactions_video ON video_interactions(video_id, interaction_type, created_at DESC);
CREATE INDEX idx_video_interactions_user ON video_interactions(user_id, interaction_type, created_at DESC);
CREATE INDEX idx_video_interactions_created ON video_interactions(created_at DESC);

-- Trending scores (materialized view updated periodically)
CREATE TABLE IF NOT EXISTS trending_scores (
    video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    score FLOAT NOT NULL DEFAULT 0,
    views_24h INTEGER DEFAULT 0,
    likes_24h INTEGER DEFAULT 0,
    comments_24h INTEGER DEFAULT 0,
    shares_24h INTEGER DEFAULT 0,
    completion_rate FLOAT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trending_scores_score ON trending_scores(score DESC, updated_at DESC);

-- User preferences (not interested)
CREATE TABLE IF NOT EXISTS user_not_interested (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    reason TEXT CHECK (reason IN ('not_relevant', 'seen_too_much', 'dont_like_creator', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

CREATE INDEX idx_user_not_interested_user ON user_not_interested(user_id, created_at DESC);

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT NOT NULL UNIQUE,
    use_count INTEGER DEFAULT 0,
    trending_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hashtags_trending ON hashtags(trending_score DESC);
CREATE INDEX idx_hashtags_tag ON hashtags(tag);

-- Video hashtags junction
CREATE TABLE IF NOT EXISTS video_hashtags (
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (video_id, hashtag_id)
);

CREATE INDEX idx_video_hashtags_video ON video_hashtags(video_id);
CREATE INDEX idx_video_hashtags_hashtag ON video_hashtags(hashtag_id);

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS VOID AS $$
BEGIN
    -- Update trending scores based on recent interactions
    INSERT INTO trending_scores (video_id, score, views_24h, likes_24h, comments_24h, shares_24h, updated_at)
    SELECT 
        v.id,
        -- Trending score formula: weighted sum of recent interactions
        COALESCE(
            (COUNT(CASE WHEN vi.interaction_type = 'view' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 1.0) +
            (COUNT(CASE WHEN vi.interaction_type = 'like' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 5.0) +
            (COUNT(CASE WHEN vi.interaction_type = 'comment' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 10.0) +
            (COUNT(CASE WHEN vi.interaction_type = 'share' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 15.0)
        , 0.0) as score,
        COUNT(CASE WHEN vi.interaction_type = 'view' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as views_24h,
        COUNT(CASE WHEN vi.interaction_type = 'like' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as likes_24h,
        COUNT(CASE WHEN vi.interaction_type = 'comment' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as comments_24h,
        COUNT(CASE WHEN vi.interaction_type = 'share' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as shares_24h,
        NOW()
    FROM videos v
    LEFT JOIN video_interactions vi ON v.id = vi.video_id
    WHERE v.created_at > NOW() - INTERVAL '7 days'
    GROUP BY v.id
    ON CONFLICT (video_id) DO UPDATE SET
        score = EXCLUDED.score,
        views_24h = EXCLUDED.views_24h,
        likes_24h = EXCLUDED.likes_24h,
        comments_24h = EXCLUDED.comments_24h,
        shares_24h = EXCLUDED.shares_24h,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON video_interactions TO authenticated;
GRANT SELECT ON trending_scores TO authenticated, anon;
GRANT ALL ON user_not_interested TO authenticated;
GRANT SELECT ON hashtags TO authenticated, anon;
GRANT SELECT ON video_hashtags TO authenticated, anon;
