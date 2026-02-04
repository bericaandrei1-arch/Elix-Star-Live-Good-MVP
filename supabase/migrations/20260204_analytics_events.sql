-- Analytics Events Storage

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_event ON analytics_events(event, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

-- Partitioning by month (optional, for better performance with large data)
-- This can be set up later if needed

-- Grant permissions (service role will insert via API)
GRANT SELECT ON analytics_events TO authenticated;
