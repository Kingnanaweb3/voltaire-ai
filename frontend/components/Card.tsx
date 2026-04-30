'use client';
import { T } from '@/lib/tokens';

export function Card({ children, style = {}, accent = false }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
}) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${accent ? T.borderAccent : T.border}`,
      borderRadius: 16,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${T.lime}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}
