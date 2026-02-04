-- ===================================================================
-- ELIX STAR MVP - ALL NEW FEATURES (Combined Migration)
-- Run this ONE file in Supabase SQL Editor to add all features
-- Date: February 4, 2026
-- ===================================================================

-- ===================================================================
-- 1. WALLET & CURRENCY SYSTEM
-- ===================================================================

-- Create wallet_ledger table (immutable transaction log)
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL CHECK (currency IN ('coins', 'diamonds')),
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('purchase', 'gift_sent', 'gift_received', 'refund', 'adjustment', 'battle_reward')),
    reference_id UUID,
    balance_after BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_currency ON wallet_ledger(user_id, currency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_reference ON wallet_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at DESC);

-- Create wallets table (current balances)
CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    coins BIGINT DEFAULT 0 CHECK (coins >= 0),
    diamonds BIGINT DEFAULT 0 CHECK (diamonds >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Function to credit wallet
CREATE OR REPLACE FUNCTION credit_wallet(
    p_user_id UUID,
    p_currency TEXT,
    p_amount BIGINT,
    p_reference_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT AS $$
DECLARE
    v_new_balance BIGINT;
BEGIN
    IF p_currency = 'coins' THEN
        UPDATE wallets 
        SET coins = coins + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING coins INTO v_new_balance;
        
        IF NOT FOUND THEN
            INSERT INTO wallets (user_id, coins, diamonds)
            VALUES (p_user_id, p_amount, 0)
            RETURNING coins INTO v_new_balance;
        END IF;
    ELSE
        UPDATE wallets 
        SET diamonds = diamonds + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING diamonds INTO v_new_balance;
        
        IF NOT FOUND THEN
            INSERT INTO wallets (user_id, coins, diamonds)
            VALUES (p_user_id, 0, p_amount)
            RETURNING diamonds INTO v_new_balance;
        END IF;
    END IF;
    
    INSERT INTO wallet_ledger (user_id, currency, type, amount, reference_type, reference_id, balance_after, metadata)
    VALUES (p_user_id, p_currency, 'credit', p_amount, p_reference_type, p_reference_id, v_new_balance, p_metadata);
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to debit wallet
CREATE OR REPLACE FUNCTION debit_wallet(
    p_user_id UUID,
    p_currency TEXT,
    p_amount BIGINT,
    p_reference_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT AS $$
DECLARE
    v_new_balance BIGINT;
    v_current_balance BIGINT;
BEGIN
    IF p_currency = 'coins' THEN
        SELECT coins INTO v_current_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
        IF v_current_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
        IF v_current_balance < p_amount THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
        
        UPDATE wallets SET coins = coins - p_amount, updated_at = NOW()
        WHERE user_id = p_user_id RETURNING coins INTO v_new_balance;
    ELSE
        SELECT diamonds INTO v_current_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
        IF v_current_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
        IF v_current_balance < p_amount THEN RAISE EXCEPTION 'Insufficient diamonds'; END IF;
        
        UPDATE wallets SET diamonds = diamonds - p_amount, updated_at = NOW()
        WHERE user_id = p_user_id RETURNING diamonds INTO v_new_balance;
    END IF;
    
    INSERT INTO wallet_ledger (user_id, currency, type, amount, reference_type, reference_id, balance_after, metadata)
    VALUES (p_user_id, p_currency, 'debit', p_amount, p_reference_type, p_reference_id, v_new_balance, p_metadata);
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 2. COMMENTS SYSTEM
-- ===================================================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (length(text) <= 500),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION increment_comment_likes() RETURNS TRIGGER AS $$
BEGIN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_increment_comment_likes
AFTER INSERT ON comment_likes FOR EACH ROW EXECUTE FUNCTION increment_comment_likes();

CREATE OR REPLACE FUNCTION decrement_comment_likes() RETURNS TRIGGER AS $$
BEGIN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_decrement_comment_likes
AFTER DELETE ON comment_likes FOR EACH ROW EXECUTE FUNCTION decrement_comment_likes();

CREATE OR REPLACE FUNCTION update_reply_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
        UPDATE comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
        UPDATE comments SET replies_count = replies_count - 1 WHERE id = OLD.parent_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_reply_count
AFTER INSERT OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- ===================================================================
-- 3. BLOCKS & MODERATION
-- ===================================================================

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'comment', 'user', 'live_stream')),
    content_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    moderator_id UUID REFERENCES auth.users(id),
    outcome TEXT CHECK (outcome IN ('removed', 'warned', 'banned', 'no_action')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id, expires_at);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 4. BATTLE BOOSTERS
-- ===================================================================

CREATE TABLE IF NOT EXISTS booster_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    effect_type TEXT NOT NULL,
    effect_value FLOAT NOT NULL,
    coin_cost INTEGER NOT NULL,
    cooldown_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO booster_catalog (id, name, description, icon, effect_type, effect_value, coin_cost, cooldown_seconds) VALUES
('2x-multiplier', '2x Multiplier', 'Double gift value for 30s', '⚡', 'multiplier', 2.0, 500, 60),
('steal-points', 'Steal Points', 'Steal 10% opponent score', '🦹', 'steal', 0.1, 1000, 120),
('freeze', 'Freeze', 'Freeze opponent for 15s', '❄️', 'freeze', 15.0, 750, 90),
('shield', 'Shield', 'Block next steal', '🛡️', 'shield', 1.0, 300, 60)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS booster_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    battle_id UUID NOT NULL,
    booster_id TEXT NOT NULL REFERENCES booster_catalog(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booster_cooldowns (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    battle_id UUID NOT NULL,
    booster_id TEXT NOT NULL REFERENCES booster_catalog(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, battle_id, booster_id)
);

CREATE OR REPLACE FUNCTION activate_booster(
    p_user_id UUID,
    p_battle_id UUID,
    p_booster_id TEXT
) RETURNS UUID AS $$
DECLARE
    v_booster RECORD;
    v_use_id UUID;
BEGIN
    SELECT * INTO v_booster FROM booster_catalog WHERE id = p_booster_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Booster not found'; END IF;
    
    -- Check cooldown
    IF EXISTS (
        SELECT 1 FROM booster_cooldowns 
        WHERE user_id = p_user_id AND battle_id = p_battle_id AND booster_id = p_booster_id AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Booster on cooldown';
    END IF;
    
    -- Debit coins
    PERFORM debit_wallet(p_user_id, 'coins', v_booster.coin_cost, 'gift_sent', p_battle_id);
    
    -- Record use
    INSERT INTO booster_uses (user_id, battle_id, booster_id) VALUES (p_user_id, p_battle_id, p_booster_id) RETURNING id INTO v_use_id;
    
    -- Set cooldown
    INSERT INTO booster_cooldowns (user_id, battle_id, booster_id, expires_at)
    VALUES (p_user_id, p_battle_id, p_booster_id, NOW() + (v_booster.cooldown_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (user_id, battle_id, booster_id) DO UPDATE SET expires_at = NOW() + (v_booster.cooldown_seconds || ' seconds')::INTERVAL;
    
    RETURN v_use_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 5. IN-APP PURCHASES
-- ===================================================================

CREATE TABLE IF NOT EXISTS coin_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    coins INTEGER NOT NULL,
    price_usd NUMERIC(10,2) NOT NULL,
    bonus_coins INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT false,
    apple_product_id TEXT,
    google_product_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO coin_packages (id, name, coins, price_usd, bonus_coins, is_popular, apple_product_id, google_product_id) VALUES
('starter', 'Starter Pack', 100, 0.99, 0, false, 'com.elixstar.coins.starter', 'com.elixstar.coins.starter'),
('popular', 'Popular Pack', 500, 4.99, 50, true, 'com.elixstar.coins.popular', 'com.elixstar.coins.popular'),
('premium', 'Premium Pack', 1000, 9.99, 200, false, 'com.elixstar.coins.premium', 'com.elixstar.coins.premium'),
('ultimate', 'Ultimate Pack', 5000, 49.99, 1500, false, 'com.elixstar.coins.ultimate', 'com.elixstar.coins.ultimate'),
('mega', 'Mega Pack', 10000, 99.99, 5000, true, 'com.elixstar.coins.mega', 'com.elixstar.coins.mega')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES coin_packages(id),
    provider TEXT NOT NULL CHECK (provider IN ('apple', 'google', 'stripe')),
    transaction_id TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION verify_purchase(
    p_user_id UUID,
    p_package_id TEXT,
    p_provider TEXT,
    p_transaction_id TEXT
) RETURNS UUID AS $$
DECLARE
    v_purchase_id UUID;
    v_package RECORD;
    v_total_coins INTEGER;
BEGIN
    -- Check if already processed
    SELECT id INTO v_purchase_id FROM purchases WHERE transaction_id = p_transaction_id;
    IF FOUND THEN RETURN v_purchase_id; END IF;
    
    SELECT * INTO v_package FROM coin_packages WHERE id = p_package_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
    
    v_total_coins := v_package.coins + COALESCE(v_package.bonus_coins, 0);
    
    INSERT INTO purchases (user_id, package_id, provider, transaction_id, status)
    VALUES (p_user_id, p_package_id, p_provider, p_transaction_id, 'completed')
    RETURNING id INTO v_purchase_id;
    
    PERFORM credit_wallet(p_user_id, 'coins', v_total_coins, 'purchase', v_purchase_id);
    
    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 6. TRENDING & DISCOVERY
-- ===================================================================

CREATE TABLE IF NOT EXISTS video_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'comment', 'share', 'save', 'not_interested', 'complete_view')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_interactions_video ON video_interactions(video_id, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_interactions_user ON video_interactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trending_scores (
    video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    score FLOAT NOT NULL DEFAULT 0,
    views_24h INTEGER DEFAULT 0,
    likes_24h INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_scores_score ON trending_scores(score DESC);

CREATE TABLE IF NOT EXISTS user_not_interested (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS hashtags (
    tag TEXT PRIMARY KEY,
    use_count INTEGER DEFAULT 0,
    trending_score FLOAT DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_hashtags (
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    hashtag TEXT NOT NULL REFERENCES hashtags(tag) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (video_id, hashtag)
);

CREATE INDEX IF NOT EXISTS idx_video_hashtags_hashtag ON video_hashtags(hashtag);

CREATE OR REPLACE FUNCTION update_trending_scores() RETURNS VOID AS $$
BEGIN
    INSERT INTO trending_scores (video_id, score, views_24h, likes_24h, updated_at)
    SELECT 
        v.id,
        COALESCE(
            (COUNT(CASE WHEN vi.interaction_type = 'view' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 1.0) +
            (COUNT(CASE WHEN vi.interaction_type = 'like' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 5.0) +
            (COUNT(CASE WHEN vi.interaction_type = 'share' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) * 15.0)
        , 0.0) as score,
        COUNT(CASE WHEN vi.interaction_type = 'view' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN vi.interaction_type = 'like' AND vi.created_at > NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER,
        NOW()
    FROM videos v
    LEFT JOIN video_interactions vi ON v.id = vi.video_id
    WHERE v.created_at > NOW() - INTERVAL '7 days'
    GROUP BY v.id
    ON CONFLICT (video_id) DO UPDATE SET
        score = EXCLUDED.score,
        views_24h = EXCLUDED.views_24h,
        likes_24h = EXCLUDED.likes_24h,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 7. INBOX & MESSAGES
-- ===================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (participant_1 < participant_2),
    UNIQUE (participant_1, participant_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'gift', 'battle_invite', 'system')),
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT,
    target_id UUID,
    title TEXT NOT NULL,
    body TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_actor_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_notification_id UUID;
BEGIN
    IF p_user_id = p_actor_id THEN RETURN NULL; END IF;
    INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, title, body, action_url)
    VALUES (p_user_id, p_type, p_actor_id, p_target_type, p_target_id, p_title, p_body, p_action_url)
    RETURNING id INTO v_notification_id;
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 8. DEVICE TOKENS
-- ===================================================================

CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id, is_active);

-- ===================================================================
-- 9. ANALYTICS EVENTS
-- ===================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event, created_at DESC);

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================

GRANT SELECT ON wallet_ledger TO authenticated;
GRANT SELECT, UPDATE ON wallets TO authenticated;
GRANT EXECUTE ON FUNCTION credit_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION debit_wallet TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;
GRANT ALL ON blocks TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON user_bans TO authenticated;
GRANT SELECT ON booster_catalog TO authenticated;
GRANT SELECT, INSERT ON booster_uses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booster_cooldowns TO authenticated;
GRANT EXECUTE ON FUNCTION activate_booster TO authenticated;
GRANT SELECT ON coin_packages TO authenticated, anon;
GRANT SELECT ON purchases TO authenticated;
GRANT EXECUTE ON FUNCTION verify_purchase TO authenticated;
GRANT SELECT, INSERT ON video_interactions TO authenticated;
GRANT SELECT ON trending_scores TO authenticated, anon;
GRANT ALL ON user_not_interested TO authenticated;
GRANT SELECT ON hashtags TO authenticated, anon;
GRANT SELECT ON video_hashtags TO authenticated, anon;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT ALL ON device_tokens TO authenticated;
GRANT SELECT ON analytics_events TO authenticated;

-- ===================================================================
-- ✅ DONE! All tables, functions, and permissions created!
-- ===================================================================
