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
  className?: string;
  onLike?: () => void;
}

const getLevelStyle = (level: number): React.CSSProperties => {
  let bg = '#1e40af';
  let border = '#3b82f6';
  
  if (level > 100) { bg = '#9d174d'; border = '#ec4899'; }
  else if (level > 60) { bg = '#6b21a8'; border = '#a855f7'; }
  else if (level > 30) { bg = '#9a3412'; border = '#f97316'; }
  else if (level > 20) { bg = '#166534'; border = '#22c55e'; }
  
  return {
    backgroundColor: bg,
    border: `1px solid ${border}`,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0,
  };
};

export function ChatOverlay({ messages, variant = 'panel', className, onLike }: ChatOverlayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    position: variant === 'overlay' ? 'absolute' : 'relative',
    bottom: variant === 'overlay' ? 0 : undefined,
    left: variant === 'overlay' ? 0 : undefined,
    width: '100%',
    height: variant === 'overlay' ? 'calc(26vh + 80px)' : '100%',
    padding: '16px',
    paddingBottom: variant === 'overlay' ? '96px' : '16px',
    boxSizing: 'border-box',
  };

  const scrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE/Edge
  };

  const messageStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const avatarStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  };

  const usernameStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#d1d5db',
    fontSize: '14px',
    flexShrink: 0,
  };

  const textStyle = (isGift?: boolean): React.CSSProperties => ({
    color: isGift ? '#facc15' : 'rgba(255,255,255,0.9)',
    fontWeight: isGift ? 'bold' : 'normal',
    fontSize: '14px',
  });

  return (
    <div style={containerStyle} className={className}>
      <div style={scrollStyle} className="chat-scroll">
        {messages.map((msg) => (
          <div key={msg.id} style={messageStyle}>
            {!msg.isSystem && (
              <LevelBadge level={msg.level || 1} size={40} layout="fixed" />
            )}
            
            <span style={usernameStyle}>{msg.username}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>:</span>
            <span style={textStyle(msg.isGift)}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
