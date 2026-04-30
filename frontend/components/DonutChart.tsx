'use client';
import { T } from '@/lib/tokens';

export function DonutChart({ eth = 60, usdc = 40 }: { eth?: number; usdc?: number }) {
  const r = 52, cx = 64, cy = 64, stroke = 14;
  const circ = 2 * Math.PI * r;
  const ethArc = (eth / 100) * circ;
  const usdcArc = (usdc / 100) * circ;
  return (
    <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.blue} strokeWidth={stroke}
        strokeDasharray={`${usdcArc} ${circ}`} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.lime} strokeWidth={stroke}
        strokeDasharray={`${ethArc} ${circ}`} strokeDashoffset={-usdcArc} strokeLinecap="round" />
    </svg>
  );
}
