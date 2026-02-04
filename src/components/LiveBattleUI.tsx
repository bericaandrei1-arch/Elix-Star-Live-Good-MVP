import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { websocket } from '../lib/websocket';
import { Zap, Trophy, Clock, Gift, Sword, Shield, Target } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface Battle {
  id: string;
  host_stream_id: string;
  challenger_stream_id: string;
  status: 'pending' | 'active' | 'completed';
  host_score: number;
  challenger_score: number;
  time_limit_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  winner_id: string | null;
}

interface Booster {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect_type: string;
  effect_value: number;
  coin_cost: number;
  cooldown_seconds: number;
}

interface LiveBattleUIProps {
  battleId: string;
  streamId: string;
  isHost: boolean;
  userId: string;
}

export default function LiveBattleUI({ battleId, streamId, isHost, userId }: LiveBattleUIProps) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedBooster, setSelectedBooster] = useState<Booster | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBattle();
    loadBoosters();
    setupWebSocket();

    return () => {
      websocket.off('battle_score_update', handleScoreUpdate);
      websocket.off('booster_activated', handleBoosterActivated);
    };
  }, [battleId]);

  useEffect(() => {
    if (battle?.started_at && battle.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - new Date(battle.started_at!).getTime()) / 1000;
        const remaining = Math.max(0, battle.time_limit_seconds - elapsed);
        setTimeRemaining(Math.floor(remaining));

        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [battle]);

  const loadBattle = async () => {
    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (data) setBattle(data);
  };

  const loadBoosters = async () => {
    const { data, error } = await supabase.from('booster_catalog').select('*').order('coin_cost');

    if (data) setBoosters(data);
  };

  const setupWebSocket = () => {
    websocket.on('battle_score_update', handleScoreUpdate);
    websocket.on('booster_activated', handleBoosterActivated);
  };

  const handleScoreUpdate = (data: { battle_id: string; host_score: number; challenger_score: number }) => {
    if (data.battle_id === battleId) {
      setBattle(prev => (prev ? { ...prev, host_score: data.host_score, challenger_score: data.challenger_score } : null));
    }
  };

  const handleBoosterActivated = (data: { battle_id: string; booster_id: string; user_id: string }) => {
    if (data.battle_id === battleId) {
      // Add visual effect or notification
      const booster = boosters.find(b => b.id === data.booster_id);
      if (booster) {
        // Show temporary notification
        alert(`${data.user_id === userId ? 'You' : 'Opponent'} activated ${booster.name}!`);
      }
    }
  };

  const activateBooster = async (booster: Booster) => {
    try {
      const { error } = await supabase.rpc('activate_booster', {
        p_user_id: userId,
        p_battle_id: battleId,
        p_booster_id: booster.id,
      });

      if (error) throw error;

      // Set cooldown
      setCooldowns(prev => ({ ...prev, [booster.id]: booster.cooldown_seconds }));

      // Send WebSocket event
      websocket.send('booster_activated', {
        battle_id: battleId,
        booster_id: booster.id,
        user_id: userId,
      });

      trackEvent('booster_activate', {
        battle_id: battleId,
        booster_id: booster.id,
        cost: booster.coin_cost,
      });

      setSelectedBooster(null);
    } catch (error) {
      console.error('Failed to activate booster:', error);
      alert('Failed to activate booster. Check your coin balance.');
    }
  };

  if (!battle) return null;

  const hostScore = battle.host_score;
  const challengerScore = battle.challenger_score;
  const totalScore = hostScore + challengerScore;
  const hostPercent = totalScore > 0 ? (hostScore / totalScore) * 100 : 50;

  return (
    <div className="absolute top-4 left-0 right-0 z-30 px-4">
      {/* Score Bar */}
      <div className="rounded-2xl p-4 mb-3">
        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#E6B36A]" />
          <span className="text-white font-bold">
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-8 rounded-full overflow-hidden mb-2">
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
            style={{ width: `${hostPercent}%` }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
            style={{ width: `${100 - hostPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-white font-bold text-sm">
            <span>{formatNumber(hostScore)}</span>
            <Trophy className="w-5 h-5 text-[#E6B36A]" />
            <span>{formatNumber(challengerScore)}</span>
          </div>
        </div>

        {/* Status */}
        {battle.status === 'pending' && (
          <p className="text-center text-xs text-white/60">Waiting for challenger...</p>
        )}
        {battle.status === 'completed' && (
          <div className="text-center">
            <Trophy className="w-6 h-6 text-[#E6B36A] mx-auto mb-1" />
            <p className="text-sm text-white/80 font-semibold">
              {battle.winner_id === userId ? 'You Won!' : 'Battle Ended'}
            </p>
          </div>
        )}
      </div>

      {/* Boosters Panel */}
      {battle.status === 'active' && (
        <div className="rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#E6B36A]" />
            <span className="text-xs font-semibold text-white/80">Battle Boosters</span>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {boosters.slice(0, 4).map(booster => (
              <button
                key={booster.id}
                onClick={() => setSelectedBooster(booster)}
                disabled={!!cooldowns[booster.id]}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg hover:brightness-125 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl">{booster.icon}</div>
                <span className="text-xs font-semibold text-white/80">{booster.coin_cost}</span>
                {cooldowns[booster.id] && (
                  <span className="text-xs text-red-400">{cooldowns[booster.id]}s</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Booster Confirmation Modal */}
      {selectedBooster && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setSelectedBooster(null)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{selectedBooster.icon}</div>
              <h3 className="text-xl font-bold mb-2">{selectedBooster.name}</h3>
              <p className="text-sm text-white/60 mb-4">{selectedBooster.description}</p>
              <div className="flex items-center justify-center gap-2 text-[#E6B36A] font-bold">
                <Gift className="w-5 h-5" />
                {selectedBooster.coin_cost} Coins
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedBooster(null)}
                className="flex-1 py-3 rounded-xl font-semibold hover:brightness-125 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => activateBooster(selectedBooster)}
                className="flex-1 py-3 bg-[#E6B36A] text-black rounded-xl font-semibold hover:opacity-80 transition"
              >
                Activate
              </button>
            </div>
          </div>
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
