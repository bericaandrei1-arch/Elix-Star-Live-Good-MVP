import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { websocket } from '../lib/websocket';
import { Sword, X, Clock, Users } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url: string | null;
  viewer_count: number;
  creator?: { username: string; avatar_url: string | null };
}

interface BattleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostStreamId: string;
  hostUserId: string;
}

export default function BattleInviteModal({
  isOpen,
  onClose,
  hostStreamId,
  hostUserId,
}: BattleInviteModalProps) {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [timeLimit, setTimeLimit] = useState(180); // 3 minutes default
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLiveStreams();
    }
  }, [isOpen]);

  const loadLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, creator:profiles!user_id(username, avatar_url)')
        .eq('status', 'live')
        .neq('user_id', hostUserId)
        .order('viewer_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLiveStreams(data || []);
    } catch (error) {
      console.error('Failed to load streams:', error);
    }
  };

  const sendInvite = async () => {
    if (!selectedStream) return;

    setLoading(true);
    try {
      const { data: battle, error } = await supabase
        .from('battles')
        .insert({
          host_stream_id: hostStreamId,
          challenger_stream_id: selectedStream.id,
          status: 'pending',
          time_limit_seconds: timeLimit,
        })
        .select()
        .single();

      if (error) throw error;

      // Send WebSocket notification to challenger
      websocket.send('battle_invite', {
        battle_id: battle.id,
        host_stream_id: hostStreamId,
        challenger_stream_id: selectedStream.id,
        challenger_user_id: selectedStream.user_id,
        time_limit: timeLimit,
      });

      // Create notification
      await supabase.rpc('create_notification', {
        p_user_id: selectedStream.user_id,
        p_type: 'battle_invite',
        p_actor_id: hostUserId,
        p_target_type: 'live_stream',
        p_target_id: battle.id,
        p_title: 'challenged you to a battle!',
        p_body: `${timeLimit / 60} minute battle`,
        p_action_url: `/live/${selectedStream.id}?battle=${battle.id}`,
      });

      trackEvent('battle_invite_sent', {
        battle_id: battle.id,
        challenger_stream_id: selectedStream.id,
      });

      alert('Battle invitation sent!');
      onClose();
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('Failed to send battle invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] w-full max-h-[80vh] rounded-t-3xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sword className="w-6 h-6 text-[#E6B36A]" />
            <h2 className="text-lg font-bold">Challenge to Battle</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:brightness-125 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Time Limit Selector */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-white/60" />
            <span className="text-sm font-semibold">Battle Duration</span>
          </div>
          <div className="flex gap-2">
            {[60, 120, 180, 300].map(seconds => (
              <button
                key={seconds}
                onClick={() => setTimeLimit(seconds)}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  timeLimit === seconds
                    ? 'bg-[#E6B36A] text-black'
                    : 'bg-transparent text-white hover:brightness-125'
                }`}
              >
                {seconds / 60}m
              </button>
            ))}
          </div>
        </div>

        {/* Live Streams List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-white/60" />
            <span className="text-sm font-semibold">Select Opponent</span>
          </div>

          {liveStreams.length === 0 && (
            <div className="text-center py-12 text-white/40">No live streams available</div>
          )}

          <div className="space-y-2">
            {liveStreams.map(stream => (
              <button
                key={stream.id}
                onClick={() => setSelectedStream(stream)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                  selectedStream?.id === stream.id
                    ? 'bg-[#E6B36A]/20 border-2 border-[#E6B36A]'
                    : 'bg-transparent border-2 border-transparent hover:brightness-125'
                }`}
              >
                <img
                  src={stream.thumbnail_url || stream.creator?.avatar_url || '/placeholder.png'}
                  alt={stream.title}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold mb-1">{stream.creator?.username || 'Unknown'}</p>
                  <p className="text-sm text-white/60 truncate">{stream.title}</p>
                  <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                    <Users className="w-3 h-3" />
                    {stream.viewer_count} watching
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-white/10">
          <button
            onClick={sendInvite}
            disabled={!selectedStream || loading}
            className="w-full py-4 bg-[#E6B36A] text-black rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {loading ? 'Sending...' : 'Send Battle Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
