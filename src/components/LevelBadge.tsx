import React from 'react';
import { Gem } from 'lucide-react';

interface LevelBadgeProps {
  level: number;
  className?: string;
  size?: number;
  layout?: 'fit' | 'fixed';
  variant?: 'clean' | 'default' | 'chat';
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, className = "", size = 40, layout = 'fit', variant = 'clean' }) => {
  const tier = level >= 100 ? 'red' : level >= 75 ? 'pink' : level >= 50 ? 'orange' : level >= 25 ? 'green' : 'blue';
  const safeLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  const isChat = variant === 'chat';

  const colors =
    tier === 'blue'
      ? { bg: '#1e40af', border: '#3b82f6' } // Blue 800 bg, Blue 500 border
      : tier === 'green'
        ? { bg: '#166534', border: '#22c55e' } // Green 800 bg, Green 500 border
        : tier === 'orange'
          ? { bg: '#9a3412', border: '#f97316' } // Orange 800 bg, Orange 500 border
          : tier === 'pink'
            ? { bg: '#db2777', border: '#ec4899' } // Pink 700 bg, Pink 500 border
            : { bg: '#9d174d', border: '#ec4899' }; // Red (default)

  // size=10 is used in chat. We are bumping it up significantly as requested.
  // ~4mm is approx 15px. User asked for +4mm height/width relative to original small size.
  // Original was 14px height. New target ~24px.
  // Original width 28px. New target ~50px.
  
  const height = size === 10 ? 28 : (size === 2 ? 2 : (size === 14 ? 14 : Math.max(46, Math.round(size * 1.5))));
  const width = size === 10 ? 60 : (size === 2 ? 3 : (size === 14 ? 16 : (layout === 'fixed' ? Math.round(height * 4.0) : undefined)));
  const radius = size === 10 ? 6 : (size === 2 ? 1 : (size === 14 ? 4 : (isChat ? 6 : Math.max(8, Math.round(height * 0.214)))));
  const fontSize = size === 10 ? 13 : size === 2 ? 1 : size === 14 ? 12 : Math.max(18, Math.round(height * 0.45));
  const iconSize = size === 10 ? 10 : Math.max(8, Math.round(fontSize * 0.8));

  return (
    <span
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{
        height,
        width,
        flexShrink: 0,
        paddingLeft: (layout === 'fixed' || size === 10) ? 0 : Math.round(height * 1.4),
        paddingRight: (layout === 'fixed' || size === 10) ? 0 : Math.round(height * 1.4),
        filter: 'none',
      }}
    >
      {/* Use custom image for level badge - dynamic color based on tier */}
      <img 
        src={
          tier === 'blue' ? '/Icons/level-badge-blue.png?v=6' :
          tier === 'green' ? '/Icons/level-badge-green.png?v=6' :
          tier === 'orange' ? '/Icons/level-badge-orange.png?v=6' :
          tier === 'pink' ? '/Icons/level-badge-pink.png?v=6' :
          tier === 'red' ? '/Icons/level-badge-red.png?v=6' :
          '/Icons/level-badge-green.png?v=6'
        } 
        alt={`Level ${safeLevel}`}
        className="absolute inset-0 w-full h-full object-contain"
      />
      
      {/* Level number overlay */}
      <span
        className={`relative z-10 antialiased ${size === 10 ? 'font-bold' : 'font-black'}`}
        style={{
          color: '#000000',
          fontSize,
          textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 2px 3px rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.3)',
          WebkitTextStroke: '0.5px rgba(255,255,255,0.3)',
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          transform: size === 10 ? 'translateY(2px)' : 'none',
          fontWeight: '900',
        }}
      >
        {safeLevel}
      </span>
    </span>
  );
};
