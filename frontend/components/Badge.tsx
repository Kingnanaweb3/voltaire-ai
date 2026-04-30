'use client';
import { T } from '@/lib/tokens';

export function Badge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    executed: { color: T.lime, bg: T.limeDim, label: 'Executed' },
    skipped: { color: T.textSecondary, bg: 'rgba(255,255,255,0.05)', label: 'Skipped' },
    failed: { color: T.red, bg: 'rgba(248,113,113,0.1)', label: 'Failed' },
    healthy: { color: T.lime, bg: T.limeDim, label: 'Healthy' },
    degraded: { color: T.amber, bg: 'rgba(251,191,36,0.1)', label: 'Degraded' },
    'stop-loss-executed': { color: T.amber, bg: 'rgba(251,191,36,0.1)', label: 'Stop-Loss' },
  };
  const s = map[status] || map.skipped;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontFamily: T.mono, fontSize: 10,
      padding: '3px 8px', borderRadius: 6, fontWeight: 500,
    }}>
      {s.label}
    </span>
  );
}
