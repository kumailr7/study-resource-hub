import React from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  glowBlur?: number;
  className?: string;
  style?: React.CSSProperties;
}

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  color = '#ff86c2',
  speed = 4,
  glowBlur = 8,
  className = '',
  style = {},
}) => {
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {/* Rotating glow ring */}
      <div
        style={{
          position: 'absolute',
          inset: -1,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transform: 'translate(-50%, -50%)',
            background: `conic-gradient(transparent 0deg, ${color} 60deg, transparent 120deg, transparent 200deg, ${color}50 260deg, transparent 300deg)`,
            animation: `borderGlowRotate ${speed}s linear infinite`,
            filter: `blur(${glowBlur}px)`,
            opacity: 0.75,
          }}
        />
      </div>
      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
