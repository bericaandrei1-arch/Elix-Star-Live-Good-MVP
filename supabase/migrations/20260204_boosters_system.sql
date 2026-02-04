-- Battle Boosters System

-- Booster catalog
CREATE TABLE IF NOT EXISTS booster_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
    effect_type TEXT NOT NULL CHECK (effect_type IN ('multiplier', 'steal', 'catch', 'speed', 'triple')),
    params JSONB NOT NULL,
    cooldown_ms INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 10000,
    icon_url TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default boosters
INSERT INTO booster_catalog (id, name, description, coin_cost, effect_type, params, cooldown_ms, duration_ms, rarity) VALUES
('x2_multiplier', 'x2 Multiplier', 'Next 10s gifts multiplied by 2', 50, 'multiplier', '{"multiplier": 2, "duration_ms": 10000}'::jsonb, 30000, 10000, 'common'),
('x3_multiplier', 'x3 Multiplier', 'Next 10s gifts multiplied by 3', 100, 'multiplier', '{"multiplier": 3, "duration_ms": 10000}'::jsonb, 45000, 10000, 'rare'),
('glove_steal', 'Glove', 'Steal 10% from opponent', 150, 'steal', '{"steal_percent": 10}'::jsonb, 60000, 0, 'epic'),
('catch_x5', 'Catch x5', 'Next gift multiplied by 5', 200, 'catch', '{"multiplier": 5, "next_gifts": 1}'::jsonb, 90000, 30000, 'epic'),
('speed_x2', 'Speed x2', 'Send gifts 2x faster', 75, 'speed', '{"speed_multiplier": 2, "duration_ms": 15000}'::jsonb, 0, 15000, 'common'),
('speed_x3', 'Speed x3', 'Send gifts 3x faster', 125, 'speed', '{"speed_multiplier": 3, "duration_ms": 15000}'::jsonb, 0, 15000, 'rare'),
('elix_star', 'Elix Star', 'Next 3 gifts tripled', 250, 'triple', '{"multiplier": 3, "next_gifts": 3}'::jsonb, 120000, 60000, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- Booster uses (transactions)
CREATE TABLE IF NOT EXISTS booster_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booster_id TEXT NOT NULL REFERENCES booster_catalog(id),
    target_side TEXT NOT NULL CHECK (target_side IN ('left', 'right')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed')),
    coins_spent INTEGER NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    consumed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_booster_uses_battle ON booster_uses(battle_id, status, activated_at DESC);
CREATE INDEX idx_booster_uses_user ON booster_uses(user_id, created_at DESC);
CREATE INDEX idx_booster_uses_active ON booster_uses(room_id, status, expires_at) WHERE status = 'active';

-- Booster cooldowns (per user per battle)
CREATE TABLE IF NOT EXISTS booster_cooldowns (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    battle_id UUID NOT NULL,
    booster_id TEXT NOT NULL REFERENCES booster_catalog(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, battle_id, booster_id)
);

CREATE INDEX idx_booster_cooldowns_expires ON booster_cooldowns(expires_at);

-- Function to activate booster
CREATE OR REPLACE FUNCTION activate_booster(
    p_user_id UUID,
    p_battle_id UUID,
    p_room_id UUID,
    p_booster_id TEXT,
    p_target_side TEXT
) RETURNS UUID AS $$
DECLARE
    v_booster RECORD;
    v_use_id UUID;
    v_cooldown_expires TIMESTAMP WITH TIME ZONE;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get booster details
    SELECT * INTO v_booster 
    FROM booster_catalog 
    WHERE id = p_booster_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booster not found or inactive';
    END IF;
    
    -- Check cooldown
    SELECT expires_at INTO v_cooldown_expires
    FROM booster_cooldowns
    WHERE user_id = p_user_id 
      AND battle_id = p_battle_id 
      AND booster_id = p_booster_id
      AND expires_at > NOW();
    
    IF FOUND THEN
        RAISE EXCEPTION 'Booster on cooldown until %', v_cooldown_expires;
    END IF;
    
    -- Debit coins
    PERFORM debit_wallet(
        p_user_id,
        'coins',
        v_booster.coin_cost,
        'booster_activation',
        p_battle_id::UUID,
        json_build_object('booster_id', p_booster_id)::jsonb
    );
    
    -- Calculate expiration
    v_expires_at := NOW() + (v_booster.duration_ms || ' milliseconds')::INTERVAL;
    
    -- Create booster use record
    INSERT INTO booster_uses (
        battle_id, room_id, user_id, booster_id, target_side, coins_spent, expires_at
    ) VALUES (
        p_battle_id, p_room_id, p_user_id, p_booster_id, p_target_side, v_booster.coin_cost, v_expires_at
    ) RETURNING id INTO v_use_id;
    
    -- Set cooldown if applicable
    IF v_booster.cooldown_ms > 0 THEN
        INSERT INTO booster_cooldowns (user_id, battle_id, booster_id, expires_at)
        VALUES (p_user_id, p_battle_id, p_booster_id, NOW() + (v_booster.cooldown_ms || ' milliseconds')::INTERVAL)
        ON CONFLICT (user_id, battle_id, booster_id) 
        DO UPDATE SET expires_at = NOW() + (v_booster.cooldown_ms || ' milliseconds')::INTERVAL;
    END IF;
    
    RETURN v_use_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON booster_catalog TO authenticated;
GRANT SELECT, INSERT ON booster_uses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booster_cooldowns TO authenticated;
GRANT EXECUTE ON FUNCTION activate_booster TO authenticated;
