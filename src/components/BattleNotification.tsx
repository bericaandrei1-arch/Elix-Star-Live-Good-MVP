import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { websocket } from '../lib/websocket';
import { Sword, Check, X, Clock } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface BattleInvite {
  battle_id: string;
  host_stream_id: string;
  challenger_stream_id: string;
  host_username: string;
  time_limit: number;
}

interface BattleNotificationProps {
  userId: string;
}

export default function BattleNotification({ userId }: BattleNotificationProps) {
  const [pendingInvite, setPendingInvite] = useState<BattleInvite | null>(null);
  const [countdown, setCountdown] = useState(30); // 30 seconds to respond

  useEffect(() => {
    // Listen for battle invitations
    websocket.on('battle_invite', handleBattleInvite);

    return () => {
      websocket.off('battle_invite', handleBattleInvite);
    };
  }, []);

  useEffect(() => {
    if (pendingInvite && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0 && pendingInvite) {
      // Auto-decline after timeout
      declineBattle();
    }
  }, [pendingInvite, countdown]);

  const handleBattleInvite = async (data: any) => {
    // Check if this user is the challenger
    const { data: stream } = await supabase
      .from('live_streams')
      .select('user_id')
      .eq('id', data.challenger_stream_id)
      .single();

    if (stream && stream.user_id === userId) {
      // Get host username
      const { data: hostStream } = await supabase
        .from('live_streams')
        .select('user_id, profiles!user_id(username)')
        .eq('id', data.host_stream_id)
        .single();

      const hostUsername = (hostStream as any)?.profiles?.username || 'Unknown';

      setPendingInvite({
        battle_id: data.battle_id,
        host_stream_id: data.host_stream_id,
        challenger_stream_id: data.challenger_stream_id,
        host_username: hostUsername,
        time_limit: data.time_limit,
      });
      setCountdown(30);
    }
  };

  const acceptBattle = async () => {
    if (!pendingInvite) return;

    try {
      // Update battle status
      const { error } = await supabase
        .from('battles')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', pendingInvite.battle_id);

      if (error) throw error;

      // Notify host
      websocket.send('battle_accepted', {
        battle_id: pendingInvite.battle_id,
        host_stream_id: pendingInvite.host_stream_id,
        challenger_stream_id: pendingInvite.challenger_stream_id,
      });

      trackEvent('battle_accept', { battle_id: pendingInvite.battle_id });

      alert('Battle accepted! Get ready!');
      setPendingInvite(null);
    } catch (error) {
      console.error('Failed to accept battle:', error);
      alert('Failed to accept battle');
    }
  };

  const declineBattle = async () => {
    if (!pendingInvite) return;

    try {
      // Update battle status
      await supabase
        .from('battles')
        .update({ status: 'completed' })
        .eq('id', pendingInvite.battle_id);

      // Notify host
      websocket.send('battle_declined', {
        battle_id: pendingInvite.battle_id,
        host_stream_id: pendingInvite.host_stream_id,
      });

      trackEvent('battle_decline', { battle_id: pendingInvite.battle_id });

      setPendingInvite(null);
    } catch (error) {
      console.error('Failed to decline battle:', error);
    }
  };

  if (!pendingInvite) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-red-500/90 to-orange-500/90  rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
            <Sword className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white mb-1">Battle Challenge!</h3>
            <p className="text-sm text-white/90 mb-2">
              <span className="font-semibold">{pendingInvite.host_username}</span> challenged you to a{' '}
              {pendingInvite.time_limit / 60} minute battle!
            </p>

            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80 font-semibold">{countdown}s to respond</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={acceptBattle}
                className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Accept
              </button>
              <button
                onClick={declineBattle}
                className="flex-1 py-3 text-white rounded-xl font-bold hover:brightness-125 transition flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
