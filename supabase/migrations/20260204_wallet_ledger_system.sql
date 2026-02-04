-- Wallet Ledger System (Immutable Transaction Log)

-- Create wallet_ledger table (immutable)
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

-- Create indexes for fast queries
CREATE INDEX idx_wallet_ledger_user_currency ON wallet_ledger(user_id, currency, created_at DESC);
CREATE INDEX idx_wallet_ledger_reference ON wallet_ledger(reference_type, reference_id);
CREATE INDEX idx_wallet_ledger_created_at ON wallet_ledger(created_at DESC);

-- Create wallets table (current balances)
CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    coin_balance BIGINT DEFAULT 0 CHECK (coin_balance >= 0),
    diamond_balance BIGINT DEFAULT 0 CHECK (diamond_balance >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Function to credit wallet (with ledger entry)
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
    -- Lock wallet row
    IF p_currency = 'coins' THEN
        UPDATE wallets 
        SET coin_balance = coin_balance + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING coin_balance INTO v_new_balance;
        
        -- Create wallet if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO wallets (user_id, coin_balance, diamond_balance)
            VALUES (p_user_id, p_amount, 0)
            RETURNING coin_balance INTO v_new_balance;
        END IF;
    ELSE
        UPDATE wallets 
        SET diamond_balance = diamond_balance + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING diamond_balance INTO v_new_balance;
        
        IF NOT FOUND THEN
            INSERT INTO wallets (user_id, coin_balance, diamond_balance)
            VALUES (p_user_id, 0, p_amount)
            RETURNING diamond_balance INTO v_new_balance;
        END IF;
    END IF;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (
        user_id, currency, type, amount, reference_type, reference_id, balance_after, metadata
    ) VALUES (
        p_user_id, p_currency, 'credit', p_amount, p_reference_type, p_reference_id, v_new_balance, p_metadata
    );
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to debit wallet (with ledger entry)
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
    -- Lock wallet row and check balance
    IF p_currency = 'coins' THEN
        SELECT coin_balance INTO v_current_balance
        FROM wallets 
        WHERE user_id = p_user_id
        FOR UPDATE;
        
        IF v_current_balance IS NULL THEN
            RAISE EXCEPTION 'Wallet not found';
        END IF;
        
        IF v_current_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient coins: % < %', v_current_balance, p_amount;
        END IF;
        
        UPDATE wallets 
        SET coin_balance = coin_balance - p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING coin_balance INTO v_new_balance;
    ELSE
        SELECT diamond_balance INTO v_current_balance
        FROM wallets 
        WHERE user_id = p_user_id
        FOR UPDATE;
        
        IF v_current_balance IS NULL THEN
            RAISE EXCEPTION 'Wallet not found';
        END IF;
        
        IF v_current_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient diamonds: % < %', v_current_balance, p_amount;
        END IF;
        
        UPDATE wallets 
        SET diamond_balance = diamond_balance - p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING diamond_balance INTO v_new_balance;
    END IF;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (
        user_id, currency, type, amount, reference_type, reference_id, balance_after, metadata
    ) VALUES (
        p_user_id, p_currency, 'debit', p_amount, p_reference_type, p_reference_id, v_new_balance, p_metadata
    );
    
    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON wallet_ledger TO authenticated;
GRANT SELECT, UPDATE ON wallets TO authenticated;
GRANT EXECUTE ON FUNCTION credit_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION debit_wallet TO authenticated;
