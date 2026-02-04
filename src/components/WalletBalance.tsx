import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WalletBalance {
  coins: number;
  diamonds: number;
}

interface WalletBalanceProps {
  userId: string | null;
  variant?: 'full' | 'compact';
  onClick?: () => void;
}

export default function WalletBalance({ userId, variant = 'full', onClick }: WalletBalanceProps) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<WalletBalance>({ coins: 0, diamonds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadBalance();
      
      // Subscribe to wallet changes
      const channel = supabase
        .channel('wallet-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${userId}`,
          },
          handleWalletUpdate
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const loadBalance = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('coins, diamonds')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Wallet doesn't exist, create it
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: userId, coins: 0, diamonds: 0 })
          .select()
          .single();
        
        if (newWallet) {
          setBalance({ coins: newWallet.coins, diamonds: newWallet.diamonds });
        }
      } else {
        setBalance({ coins: data.coins, diamonds: data.diamonds });
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletUpdate = (payload: any) => {
    if (payload.new) {
      setBalance({
        coins: payload.new.coins || 0,
        diamonds: payload.new.diamonds || 0,
      });
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/purchase-coins');
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E6B36A]/20 to-[#B8935C]/20 border border-[#E6B36A]/30 rounded-full hover:opacity-80 transition"
      >
        <Sparkles className="w-4 h-4 text-[#E6B36A]" />
        <span className="text-sm font-bold text-white">{formatNumber(balance.coins)}</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#E6B36A]/10 to-[#B8935C]/10 border border-[#E6B36A]/20 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">My Wallet</h3>
        <button
          onClick={handleClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#E6B36A] text-black rounded-full text-xs font-bold hover:opacity-90 transition"
        >
          <Plus className="w-3 h-3" />
          Add Coins
        </button>
      </div>

      <div className="flex gap-4">
        {/* Coins */}
        <div className="flex-1 bg-black20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#E6B36A]" />
            <span className="text-xs text-white/60">Coins</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(balance.coins)}</p>
        </div>

        {/* Diamonds */}
        <div className="flex-1 bg-black20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 text-blue-400">💎</div>
            <span className="text-xs text-white/60">Diamonds</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(balance.diamonds)}</p>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black40 rounded-2xl flex items-center justify-center">
          <div className="text-xs text-white/60">Loading...</div>
        </div>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
