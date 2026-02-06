import React, { useEffect, useRef } from 'react';
import { LevelBadge } from './LevelBadge';

interface Message {
  id: string;
  username: string;
  text: string;
  isGift?: boolean;
  level?: number;
  isSystem?: boolean;
  avatar?: string;
}

interface ChatOverlayProps {
  messages: Message[];
  variant?: 'panel' | 'overlay';
  compact?: boolean;
  className?: string;
  onLike?: () => void;
  onHeartSpawn?: (clientX: number, clientY: number) => void;
}

export function ChatOverlay({ messages, variant = 'panel', compact = false, className, onLike, onHeartSpawn }: ChatOverlayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    position: variant === 'overlay' ? 'absolute' : 'relative',
    bottom: variant === 'overlay' ? 0 : undefined,
    left: variant === 'overlay' ? 0 : undefined,
    width: '100%',
    height: variant === 'overlay' ? (compact ? '30dvh' : '40dvh') : '100%',
    paddingLeft: '0px',
    paddingRight: '16px',
    paddingTop: '8px',
    boxSizing: 'border-box',
    background: 'transparent',
  };

  const scrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingLeft: '0px',
    marginLeft: '0px',
    alignItems: 'flex-start',
    width: '100%',
  };

  const messageStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    paddingLeft: '8px',
    marginLeft: '0px',
    marginTop: '0px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    justifyContent: 'flex-start',
    width: 'auto',
    maxWidth: '90%',
    alignSelf: 'flex-start',
    pointerEvents: 'auto',
    textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)',
    background: 'rgba(0,0,0,0.45)',
    borderRadius: '8px',
  };

  const usernameStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#d1d5db',
    fontSize: '14px',
    flexShrink: 0,
    marginLeft: '0px',
  };

  const textStyle = (isGift?: boolean): React.CSSProperties => ({
    color: isGift ? '#facc15' : 'rgba(255,255,255,0.9)',
    fontWeight: isGift ? 'bold' : 'normal',
    fontSize: '14px',
  });

  return (
    <div
      style={containerStyle}
      className={className}
      onPointerDown={(e) => {
        if (onHeartSpawn) onHeartSpawn(e.clientX, e.clientY);
        if (onLike) onLike();
      }}
    >
      <div style={scrollStyle} className="chat-scroll">
        {messages.map((msg) => (
          <div key={msg.id} style={messageStyle}>
            {!msg.isSystem && (
              <LevelBadge level={msg.level || 1} size={20} layout="fixed" avatar={msg.avatar} />
            )}
            <span style={usernameStyle}>{msg.username}</span>
            <span style={textStyle(msg.isGift)}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
