-- Purchase Verification System (Apple/Google IAP)

-- Coin packages
CREATE TABLE IF NOT EXISTS coin_packages (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    coins_amount INTEGER NOT NULL CHECK (coins_amount > 0),
    price_minor INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    bonus_coins INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default packages
INSERT INTO coin_packages (id, sku, coins_amount, price_minor, bonus_coins, is_popular, display_order) VALUES
('coins_100', 'com.elixstar.coins.100', 100, 99, 0, false, 1),
('coins_500', 'com.elixstar.coins.500', 500, 499, 50, false, 2),
('coins_1000', 'com.elixstar.coins.1000', 1000, 999, 100, true, 3),
('coins_2500', 'com.elixstar.coins.2500', 2500, 2499, 300, false, 4),
('coins_5000', 'com.elixstar.coins.5000', 5000, 4999, 750, true, 5),
('coins_10000', 'com.elixstar.coins.10000', 10000, 9999, 2000, false, 6)
ON CONFLICT (id) DO NOTHING;

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES coin_packages(id),
    provider TEXT NOT NULL CHECK (provider IN ('apple', 'google', 'stripe')),
    provider_tx_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    coins_amount INTEGER NOT NULL,
    price_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded', 'chargeback')),
    raw_receipt TEXT,
    verification_response JSONB,
    verified_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_tx_id)
);

CREATE INDEX idx_purchases_user ON purchases(user_id, created_at DESC);
CREATE INDEX idx_purchases_status ON purchases(status, created_at DESC);
CREATE INDEX idx_purchases_provider_tx ON purchases(provider, provider_tx_id);

-- Function to verify and credit purchase
CREATE OR REPLACE FUNCTION verify_purchase(
    p_user_id UUID,
    p_package_id TEXT,
    p_provider TEXT,
    p_provider_tx_id TEXT,
    p_raw_receipt TEXT,
    p_verification_response JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_purchase_id UUID;
    v_package RECORD;
    v_total_coins INTEGER;
BEGIN
    -- Check if already processed (idempotency)
    SELECT id INTO v_purchase_id
    FROM purchases
    WHERE provider = p_provider AND provider_tx_id = p_provider_tx_id;
    
    IF FOUND THEN
        RETURN v_purchase_id;
    END IF;
    
    -- Get package details
    SELECT * INTO v_package
    FROM coin_packages
    WHERE id = p_package_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Package not found or inactive';
    END IF;
    
    v_total_coins := v_package.coins_amount + COALESCE(v_package.bonus_coins, 0);
    
    -- Create purchase record
    INSERT INTO purchases (
        user_id, package_id, provider, provider_tx_id, sku,
        coins_amount, price_minor, currency, status,
        raw_receipt, verification_response, verified_at
    ) VALUES (
        p_user_id, p_package_id, p_provider, p_provider_tx_id, v_package.sku,
        v_total_coins, v_package.price_minor, v_package.currency, 'verified',
        p_raw_receipt, p_verification_response, NOW()
    ) RETURNING id INTO v_purchase_id;
    
    -- Credit coins via ledger
    PERFORM credit_wallet(
        p_user_id,
        'coins',
        v_total_coins,
        'purchase',
        v_purchase_id,
        json_build_object(
            'package_id', p_package_id,
            'provider', p_provider,
            'provider_tx_id', p_provider_tx_id
        )::jsonb
    );
    
    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle refund/chargeback
CREATE OR REPLACE FUNCTION process_refund(
    p_purchase_id UUID,
    p_refund_type TEXT -- 'refund' or 'chargeback'
) RETURNS VOID AS $$
DECLARE
    v_purchase RECORD;
BEGIN
    -- Get purchase
    SELECT * INTO v_purchase
    FROM purchases
    WHERE id = p_purchase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;
    
    IF v_purchase.status = 'refunded' THEN
        RETURN; -- Already refunded
    END IF;
    
    -- Update purchase status
    UPDATE purchases
    SET status = p_refund_type,
        refunded_at = NOW()
    WHERE id = p_purchase_id;
    
    -- Debit coins (allow negative balance for tracking)
    BEGIN
        PERFORM debit_wallet(
            v_purchase.user_id,
            'coins',
            v_purchase.coins_amount,
            'refund',
            p_purchase_id,
            json_build_object('refund_type', p_refund_type)::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- If insufficient coins, still record but mark wallet as negative
        INSERT INTO wallet_ledger (
            user_id, currency, type, amount, reference_type, reference_id, balance_after, metadata
        ) VALUES (
            v_purchase.user_id, 'coins', 'debit', v_purchase.coins_amount, 'refund',
            p_purchase_id, -v_purchase.coins_amount,
            json_build_object('refund_type', p_refund_type, 'insufficient_balance', true)::jsonb
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON coin_packages TO authenticated, anon;
GRANT SELECT ON purchases TO authenticated;
GRANT EXECUTE ON FUNCTION verify_purchase TO authenticated;
GRANT EXECUTE ON FUNCTION process_refund TO authenticated; -- Only admins should call this
