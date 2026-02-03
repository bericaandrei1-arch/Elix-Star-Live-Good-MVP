import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { LevelBadge } from './LevelBadge';
import { supabase } from '../lib/supabase';
import { useRealApi } from '../lib/apiFallback';

interface Message {
  id: string;
  username: string;
  text: string;
  isGift?: boolean;
  level?: number;
  isSystem?: boolean;
  avatar?: string;
}

import { Heart } from 'lucide-react';

interface ChatOverlayProps {
  messages: Message[];
  variant?: 'panel' | 'overlay';
  className?: string;
  onLike?: () => void;
}

export function ChatOverlay({ messages, variant = 'panel', className, onLike }: ChatOverlayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [avatarsByUsername, setAvatarsByUsername] = useState<Record<string, string>>({});

  const usernamesToResolve = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      if (msg.isSystem) continue;
      if (msg.avatar) continue;
      if (!msg.username) continue;
      if (avatarsByUsername[msg.username]) continue;
      if (seen.has(msg.username)) continue;
      seen.add(msg.username);
      out.push(msg.username);
    }
    return out;
  }, [messages, avatarsByUsername]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!useRealApi) return;
    if (usernamesToResolve.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('users')
        .select('username, avatar_url')
        .in('username', usernamesToResolve)
        .limit(50);

      if (cancelled || !data) return;

      const next: Record<string, string> = {};
      for (const row of data as Array<{ username?: string; avatar_url?: string }>) {
        if (!row?.username) continue;
        if (!row?.avatar_url) continue;
        next[row.username] = row.avatar_url;
      }
      if (Object.keys(next).length === 0) return;
      setAvatarsByUsername((prev) => ({ ...prev, ...next }));
    })();

    return () => {
      cancelled = true;
    };
  }, [usernamesToResolve]);

  return (
    <div
      className={cn(
        "flex flex-col z-[40]",
        variant === 'overlay'
          ? "absolute bottom-0 left-0 w-full h-[calc(26vh+80px)] bg-transparent p-3 pb-[calc(96px+env(safe-area-inset-bottom))]"
          : "absolute bottom-0 left-0 w-full h-[calc(25vh+80px)] bg-transparent p-4 pb-[calc(96px+env(safe-area-inset-bottom))]",
        className
      )}
    >
      <div className={cn("flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5", variant === 'panel' && "pr-2")}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start text-[12px]",
              variant === 'overlay' && "px-1"
            )}
          >
            <div className="inline-block max-w-full">
              <div className="flex items-center gap-1 flex-wrap">
                {/* User Info Group (MOVED TO FRONT) */}
                <div className="flex items-center gap-1 inline-flex opacity-90 mr-1.5">
                  {!msg.isSystem && (
                    <img
                      src={
                        msg.avatar ||
                        avatarsByUsername[msg.username] ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.username)}&background=random`
                      }
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                      draggable={false}
                      loading="lazy"
                    />
                  )}
                  {!msg.isSystem && <LevelBadge level={msg.level || 1} size={10} layout="fixed" variant="chat" />}
                  <span className="font-bold text-gray-300 text-[14.5px] drop-shadow-md">
                    {msg.username}
                  </span>
                  <span className="font-bold text-white/60 text-[13px] ml-0.5">:</span>
                </div>

                {/* Message Text */}
                <span className={cn("font-medium text-[12px] leading-3.5 drop-shadow-sm flex-1", msg.isGift ? "text-secondary font-bold" : "text-white/80", variant === 'panel' && "pl-1")}>
                  {msg.text}
                </span>

                {/* Like Button for Message (Triggers Stream Like) */}
                {onLike && !msg.isSystem && (
                  <button
                    onClick={onLike}
                    className="ml-2 p-1 text-white/40 hover:text-red-500 transition-colors"
                  >
                    <Heart size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
