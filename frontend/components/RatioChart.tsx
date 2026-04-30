'use client';
import { T } from '@/lib/tokens';

export function RatioChart({ data }: { data: { label: string; eth: number; usdc: number }[] }) {
  const w = 480, h = 120;
  if (!data || data.length < 2) return null;
  const ethPts = data.map((d, i) => {
    const x = 40 + (i / (data.length - 1)) * (w - 60);
    const y = h - ((d.eth - 55) / 15) * (h - 20) - 10;
    return `${x},${y}`;
  }).join(' ');
  const usdcPts = data.map((d, i) => {
    const x = 40 + (i / (data.length - 1)) * (w - 60);
    const y = h - ((d.usdc - 30) / 15) * (h - 20) - 10;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 30}`} style={{ overflow: 'visible' }}>
      {[60, 55, 65].map(v => {
        const y = h - ((v - 55) / 15) * (h - 20) - 10;
        return <line key={v} x1={40} y1={y} x2={w - 20} y2={y}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
          strokeDasharray={v === 60 ? '4 4' : '0'} />;
      })}
      <polyline points={ethPts} fill="none" stroke={T.lime} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={usdcPts} fill="none" stroke={T.blue} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = 40 + (i / (data.length - 1)) * (w - 60);
        return <text key={i} x={x} y={h + 22} fill={T.textSecondary} fontSize="9" textAnchor="middle">{d.label}</text>;
      })}
      {[55, 60, 65].map(v => {
        const y = h - ((v - 55) / 15) * (h - 20) - 10;
        return <text key={v} x={32} y={y + 3} fill={T.textSecondary} fontSize="9" textAnchor="end">{v}%</text>;
      })}
    </svg>
  );
}
