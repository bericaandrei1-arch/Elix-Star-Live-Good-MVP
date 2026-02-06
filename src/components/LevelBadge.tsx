import React from 'react';

interface LevelBadgeProps {
  level: number;
  className?: string;
  size?: number;
  layout?: 'fit' | 'fixed';
  variant?: 'clean' | 'default' | 'chat';
  avatar?: string;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, className = "", size = 40, layout = 'fit', variant = 'clean', avatar }) => {
  const safeLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;

  // Tier color for oval fill - based on level
  const tier = safeLevel >= 100 ? 'red' : safeLevel >= 75 ? 'pink' : safeLevel >= 50 ? 'orange' : safeLevel >= 25 ? 'green' : 'blue';
  const tierFill: Record<string, string> = {
    blue:   '#0a1628',
    green:  '#0a2810',
    orange: '#2a1a08',
    pink:   '#2a0a1e',
    red:    '#2a0a0a',
  };

  const frameColor = '#ffffff';  // cerc, oval, semiluna
  const accentColor = '#E6B36A'; // diamant si scris - rose gold champagne
  const ovalFill = tierFill[tier];

  const isChat = variant === 'chat' || size === 10;

  // Circle and capsule sizing
  const circleR = isChat ? 8 : size === 2 ? 3 : size === 14 ? 6 : size === 20 ? 9 : size === 28 ? 12 : size === 70 ? 20 : Math.max(11, Math.round(size * 0.4));
  const strokeW = isChat ? 1.5 : size === 2 ? 0.5 : circleR >= 20 ? 2.5 : 2;
  const fontSize = isChat ? 8 : size === 2 ? 3 : size === 14 ? 7 : size === 20 ? 9 : size === 28 ? 11 : size === 70 ? 14 : Math.max(9, Math.round(circleR * 0.55));

  // Capsule dimensions
  const capsuleH = isChat ? 14 : Math.round(circleR * 1.2);
  const capsuleW = isChat ? 32 : Math.round(circleR * 2.4);
  const capsuleR2 = capsuleH / 2;

  // Layout
  const pad = 2;
  const cx = pad + circleR;
  const cy = pad + circleR;

  const capsuleX = cx + circleR * 0.3;
  const capsuleY = cy - capsuleH / 2;
  const totalW = capsuleX + capsuleW + capsuleR2 + pad;
  const totalH = (circleR + pad) * 2;

  // Diamond wireframe inside capsule (left side of capsule)
  const dSize = isChat ? 4 : Math.round(capsuleH * 0.38);
  const dCx = capsuleX + capsuleW * 0.5; // diamond center x
  const dCy = cy; // vertically centered

  // Classic gem diamond shape: flat top, angled sides, bottom point, facet lines
  const dTopW = dSize * 0.7;  // half-width of flat top
  const dMidW = dSize * 1.0;  // half-width at widest (crown)
  const dCrownH = dSize * 0.35; // crown height
  const dPavH = dSize * 0.8;   // pavilion height (bottom part)

  const dTop = dCy - dCrownH - dPavH * 0.1; // top of diamond
  const dCrown = dCy - dPavH * 0.1 + dCrownH * 0.2; // crown/girdle line
  const dBottom = dCy + dPavH; // bottom point

  // Diamond outline path
  const diamondOutline = [
    // Top flat edge
    `M ${dCx - dTopW} ${dTop}`,
    `L ${dCx + dTopW} ${dTop}`,
    // Right side to girdle
    `L ${dCx + dMidW} ${dCrown}`,
    // Right side to bottom point
    `L ${dCx} ${dBottom}`,
    // Left side back up to girdle
    `L ${dCx - dMidW} ${dCrown}`,
    // Back to top left
    `L ${dCx - dTopW} ${dTop}`,
  ].join(' ');

  // Facet lines inside diamond
  const facetLines = [
    // Girdle line (horizontal across widest point)
    `M ${dCx - dMidW} ${dCrown} L ${dCx + dMidW} ${dCrown}`,
    // Top facets - lines from top corners down to girdle
    `M ${dCx - dTopW} ${dTop} L ${dCx - dMidW * 0.3} ${dCrown}`,
    `M ${dCx + dTopW} ${dTop} L ${dCx + dMidW * 0.3} ${dCrown}`,
    `M ${dCx} ${dTop} L ${dCx - dMidW * 0.6} ${dCrown}`,
    `M ${dCx} ${dTop} L ${dCx + dMidW * 0.6} ${dCrown}`,
    // Bottom facets - lines from girdle to bottom point
    `M ${dCx - dMidW * 0.5} ${dCrown} L ${dCx} ${dBottom}`,
    `M ${dCx + dMidW * 0.5} ${dCrown} L ${dCx} ${dBottom}`,
  ].join(' ');

  // Level text position (right of diamond inside capsule)
  const textX = capsuleX + capsuleW * 0.95;
  const textY = cy;

  // Outer wrapper for layout compatibility
  const outerWidth = size === 10 ? 60 : size === 2 ? 3 : size === 14 ? 16 : size === 20 ? 56 : size === 28 ? 168 : size === 70 ? 280 : totalW;
  const outerHeight = size === 10 ? 28 : size === 2 ? 2 : size === 14 ? 14 : size === 20 ? 22 : size === 28 ? 42 : size === 70 ? 105 : totalH;

  const uid = `lb-${safeLevel}-${size}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <span
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{
        width: outerWidth,
        height: outerHeight,
        flexShrink: 0,
      }}
    >
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {avatar && (
          <defs>
            <clipPath id={uid}>
              <circle cx={cx} cy={cy} r={circleR - strokeW} />
            </clipPath>
          </defs>
        )}

        {/* Separator arc (semiluna) - follows circle edge exactly */}
        <path
          d={`M ${cx + Math.cos(Math.asin(capsuleH / 2 / circleR)) * circleR} ${cy - capsuleH / 2} A ${circleR} ${circleR} 0 0 1 ${cx + Math.cos(Math.asin(capsuleH / 2 / circleR)) * circleR} ${cy + capsuleH / 2}`}
          stroke={frameColor}
          strokeWidth={strokeW}
          fill="none"
        />

        {/* Capsule/oval - outline only */}
        <rect
          x={capsuleX}
          y={capsuleY}
          width={capsuleW + capsuleR2}
          height={capsuleH}
          rx={capsuleR2}
          ry={capsuleR2}
          stroke={frameColor}
          strokeWidth={strokeW}
          fill={ovalFill}
        />

        {/* Diamond wireframe inside capsule - rose gold */}
        <path
          d={diamondOutline}
          stroke={accentColor}
          strokeWidth={isChat ? 0.8 : 1.3}
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d={facetLines}
          stroke={accentColor}
          strokeWidth={isChat ? 0.5 : 0.9}
          fill="none"
          opacity={0.7}
        />

        {/* Level number inside capsule - rose gold */}
        <text
          x={textX}
          y={textY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={accentColor}
          fontSize={fontSize}
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {safeLevel}
        </text>

        {/* Avatar inside circle */}
        {avatar && (
          <image
            href={avatar}
            x={cx - circleR + strokeW}
            y={cy - circleR + strokeW}
            width={(circleR - strokeW) * 2}
            height={(circleR - strokeW) * 2}
            clipPath={`url(#${uid})`}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* Circle - outline only, on top */}
        <circle
          cx={cx}
          cy={cy}
          r={circleR - strokeW / 2}
          stroke={frameColor}
          strokeWidth={strokeW}
          fill="none"
        />

        {/* Level in circle center when no avatar */}
        {!avatar && (
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={accentColor}
            fontSize={Math.round(circleR * 0.7)}
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {safeLevel}
          </text>
        )}
      </svg>
    </span>
  );
};
