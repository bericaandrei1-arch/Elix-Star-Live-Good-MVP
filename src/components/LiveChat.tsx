import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { websocket } from '../lib/websocket';
import { Send, Gift as GiftIcon, Sparkles } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
  type: 'message' | 'gift' | 'join' | 'system';
  gift_data?: {
    gift_id: string;
    gift_name: string;
    gift_icon: string;
    quantity: number;
  };
}

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  coin_cost: number;
  animation_url: string | null;
}

interface LiveChatProps {
  streamId: string;
  currentUserId: string | null;
  onSendGift?: (giftId: string, quantity: number) => void;
}

export default function LiveChat({ streamId, currentUserId, onSendGift }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialMessages();
    loadGifts();
    setupWebSocket();

    return () => {
      websocket.off('chat_message', handleChatMessage);
      websocket.off('gift_sent', handleGiftSent);
      websocket.off('user_joined', handleUserJoined);
    };
  }, [streamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('live_chat')
        .select('*, user:profiles!user_id(username, avatar_url)')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedMessages: ChatMessage[] =
        data?.map(msg => ({
          id: msg.id,
          user_id: msg.user_id,
          username: msg.user?.username || 'Anonymous',
          avatar_url: msg.user?.avatar_url || null,
          message: msg.message,
          created_at: msg.created_at,
          type: 'message',
        })) || [];

      setMessages(formattedMessages.reverse());
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const loadGifts = async () => {
    const { data, error } = await supabase
      .from('gifts_catalog')
      .select('*')
      .order('coin_cost');

    if (data) setGifts(data);
  };

  const setupWebSocket = () => {
    websocket.on('chat_message', handleChatMessage);
    websocket.on('gift_sent', handleGiftSent);
    websocket.on('user_joined', handleUserJoined);
  };

  const handleChatMessage = (data: any) => {
    const newMessage: ChatMessage = {
      id: data.id || Date.now().toString(),
      user_id: data.user_id,
      username: data.username,
      avatar_url: data.avatar_url,
      message: data.message,
      created_at: data.created_at || new Date().toISOString(),
      type: 'message',
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleGiftSent = (data: any) => {
    const giftMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: data.user_id,
      username: data.username,
      avatar_url: data.avatar_url,
      message: '',
      created_at: new Date().toISOString(),
      type: 'gift',
      gift_data: {
        gift_id: data.gift_id,
        gift_name: data.gift_name,
        gift_icon: data.gift_icon,
        quantity: data.quantity,
      },
    };
    setMessages(prev => [...prev, giftMessage]);
  };

  const handleUserJoined = (data: any) => {
    const joinMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: data.user_id,
      username: data.username,
      avatar_url: data.avatar_url,
      message: `${data.username} joined the stream`,
      created_at: new Date().toISOString(),
      type: 'join',
    };
    setMessages(prev => [...prev, joinMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('live_chat')
        .insert({
          stream_id: streamId,
          user_id: currentUserId,
          message: inputMessage.trim(),
        })
        .select('*, user:profiles!user_id(username, avatar_url)')
        .single();

      if (error) throw error;

      // Send via WebSocket for real-time delivery
      websocket.send('chat_message', {
        id: data.id,
        user_id: currentUserId,
        username: data.user?.username,
        avatar_url: data.user?.avatar_url,
        message: data.message,
        created_at: data.created_at,
      });

      trackEvent('live_chat_message', { stream_id: streamId });
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const sendGift = async (gift: GiftItem, quantity: number = 1) => {
    if (!currentUserId) return;

    try {
      // Debit coins via wallet
      const { error: walletError } = await supabase.rpc('debit_wallet', {
        p_user_id: currentUserId,
        p_currency: 'coins',
        p_amount: gift.coin_cost * quantity,
        p_reference_type: 'gift_sent',
        p_reference_id: gift.id,
      });

      if (walletError) throw walletError;

      // Record gift
      const { data, error } = await supabase
        .from('gifts')
        .insert({
          stream_id: streamId,
          sender_id: currentUserId,
          gift_id: gift.id,
          quantity,
        })
        .select('*, sender:profiles!sender_id(username, avatar_url)')
        .single();

      if (error) throw error;

      // Send via WebSocket
      websocket.send('gift_sent', {
        user_id: currentUserId,
        username: data.sender?.username,
        avatar_url: data.sender?.avatar_url,
        gift_id: gift.id,
        gift_name: gift.name,
        gift_icon: gift.icon,
        quantity,
      });

      trackEvent('gift_send', {
        stream_id: streamId,
        gift_id: gift.id,
        quantity,
        cost: gift.coin_cost * quantity,
      });

      if (onSendGift) {
        onSendGift(gift.id, quantity);
      }

      setShowGiftPanel(false);
    } catch (error) {
      console.error('Failed to send gift:', error);
      alert('Failed to send gift. Check your coin balance.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map(msg => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGiftPanel(!showGiftPanel)}
            className="p-3 bg-white rounded-full hover:bg-black transition"
          >
            <GiftIcon className="w-5 h-5 text-[#E6B36A]" />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Say something..."
            maxLength={200}
            className="flex-1 bg-white rounded-full px-4 py-3 outline-none text-white placeholder-white/40"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            className="p-3 bg-[#E6B36A] rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      {/* Gift Panel */}
      {showGiftPanel && (
        <div className="absolute bottom-20 left-0 right-0 bg-black rounded-t-3xl p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Send Gift</h3>
            <button onClick={() => setShowGiftPanel(false)} className="text-white/60">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {gifts.map(gift => (
              <button
                key={gift.id}
                onClick={() => sendGift(gift)}
                className="flex flex-col items-center gap-2 p-3 bg-transparent rounded-xl hover:brightness-125 transition"
              >
                <div className="text-3xl">{gift.icon}</div>
                <span className="text-xs font-semibold">{gift.name}</span>
                <span className="text-xs text-[#E6B36A]">{gift.coin_cost}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.type === 'join') {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-white/40 py-1">
        <Sparkles className="w-3 h-3" />
        {message.message}
      </div>
    );
  }

  if (message.type === 'gift' && message.gift_data) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-[#E6B36A]/20 to-transparent rounded-lg">
        <img
          src={message.avatar_url || `https://ui-avatars.com/api/?name=${message.username}`}
          alt={message.username}
          className="w-6 h-6 object-cover flex-shrink-0"
        />
        <span className="text-sm font-semibold text-[#E6B36A]">{message.username}</span>
        <span className="text-sm text-white/80">sent</span>
        <span className="text-lg">{message.gift_data.gift_icon}</span>
        <span className="text-sm font-semibold text-white">
          {message.gift_data.gift_name} x{message.gift_data.quantity}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <img
        src={message.avatar_url || `https://ui-avatars.com/api/?name=${message.username}`}
        alt={message.username}
        className="w-6 h-6 object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[#E6B36A]">{message.username}: </span>
        <span className="text-sm text-white/90">{message.message}</span>
      </div>
    </div>
  );
}
