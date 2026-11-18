import type { CSSProperties, ReactNode } from 'react';

/* ---------------------------------------------------------------------------
   Decorative paper-cut shape layer
   --------------------------------------------------------------------------- */

type ShapeKind = 'circle' | 'triangle' | 'semicircle' | 'star' | 'pentagon' | 'ring';
type ShapeColor = 'yellow' | 'red' | 'pink' | 'sky' | 'green' | 'iris' | 'sunbeam' | 'frost';

const COLORS: Record<ShapeColor, string> = {
  yellow: 'var(--yellow)',
  sunbeam: 'var(--sunbeam)',
  red: 'var(--red)',
  pink: 'var(--pink)',
  sky: 'var(--sky)',
  green: 'var(--green)',
  iris: 'var(--iris)',
  frost: 'var(--frost)',
};

export type ShapeSpec = {
  kind: ShapeKind;
  color: ShapeColor;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotate?: number;
  opacity?: number;
};

export function ShapeLayer({ shapes, className = '' }: { shapes: ShapeSpec[]; className?: string }) {
  return (
    <div className={`shapes ${className}`.trim()} aria-hidden="true">
      {shapes.map((shape, index) => {
        const style: CSSProperties = {
          width: shape.size,
          height: shape.size,
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          transform: `rotate(${shape.rotate ?? 0}deg)`,
          opacity: shape.opacity ?? 1,
          background: shape.kind === 'triangle' || shape.kind === 'star' || shape.kind === 'ring' ? undefined : COLORS[shape.color],
        };
        if (shape.kind === 'triangle') {
          (style as Record<string, string | number>).borderLeftWidth = `${shape.size * 0.56}px`;
          (style as Record<string, string | number>).borderRightWidth = `${shape.size * 0.56}px`;
          (style as Record<string, string | number>).borderBottomWidth = `${shape.size}px`;
          (style as Record<string, string | number>).borderBottomColor = COLORS[shape.color];
        }
        if (shape.kind === 'star' || shape.kind === 'pentagon') {
          style.background = COLORS[shape.color];
        }
        if (shape.kind === 'ring') {
          style.borderColor = COLORS[shape.color];
          style.borderWidth = Math.max(10, Math.round(shape.size * 0.2));
        }
        return <span key={index} className={`shape shape--${shape.kind}`} style={style} />;
      })}
    </div>
  );
}

/* Shared compositions so pages feel like one family. */

export function HeroShapes() {
  return (
    <ShapeLayer
      shapes={[
        { kind: 'pentagon', color: 'yellow', size: 300, top: '-90px', left: '-70px', rotate: -12 },
        { kind: 'semicircle', color: 'red', size: 260, bottom: '-80px', left: '6%', rotate: 0 },
        { kind: 'star', color: 'green', size: 190, top: '8%', right: '6%', rotate: 14 },
        { kind: 'circle', color: 'sky', size: 150, top: '-40px', right: '18%' },
        { kind: 'pentagon', color: 'pink', size: 210, bottom: '-60px', right: '-40px', rotate: 18 },
        { kind: 'ring', color: 'iris', size: 170, top: '38%', left: '-90px' },
        { kind: 'star', color: 'sunbeam', size: 120, bottom: '12%', right: '16%', rotate: -8 },
        { kind: 'circle', color: 'yellow', size: 74, top: '26%', left: '16%' },
      ]}
    />
  );
}

export function SoftShapes() {
  return (
    <ShapeLayer
      shapes={[
        { kind: 'circle', color: 'frost', size: 420, top: '-140px', right: '-120px' },
        { kind: 'circle', color: 'frost', size: 300, bottom: '-120px', left: '-110px' },
        { kind: 'star', color: 'pink', size: 110, bottom: '10%', right: '8%', rotate: 12 },
        { kind: 'pentagon', color: 'yellow', size: 130, top: '12%', left: '4%', rotate: -14 },
      ]}
    />
  );
}

/* ---------------------------------------------------------------------------
   Type helpers
   --------------------------------------------------------------------------- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mono" style={{ color: 'rgba(17,17,24,0.6)' }}>{children}</p>;
}

export function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'T'
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatShortDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(value));
}
