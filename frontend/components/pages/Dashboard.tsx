'use client';
import { T } from '@/lib/tokens';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Terminal } from '@/components/Terminal';
import { DonutChart } from '@/components/DonutChart';
import { RatioChart } from '@/components/RatioChart';
import { Countdown } from '@/components/Countdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function DashboardPage({ data, onSimulate, simResult }: {
  data: any;
  onSimulate: () => void;
  simResult: any;
}) {
  const { status, history = [], analytics } = data;
  const lastEvent = history[history.length - 1];
  const ethPct = Math.round(((data.config?.targetRatios?.ETH || status?.config?.targetRatios?.ETH || 0.6)) * 100);
  const usdcPct = 100 - ethPct;

  // Real drift history from SQLite — only points with non-zero data
  const driftData = (data.driftHistory?.points || [])
    .filter((p: any) => p.eth > 0 || p.usdc > 0)
    .slice(-12)
    .map((p: any) => ({
      label: p.date.split(',')[1]?.trim() || p.date,
      eth: p.eth,
      usdc: p.usdc,
    }));

  const agentLines = [
    { t: 0, text: '→ Fetching portfolio state from Base Sepolia...' },
    { t: 400, text: `→ Total: $${(lastEvent?.portfolioState?.totalUsdValue || 0).toFixed(2)}` },
    { t: 800, text: `→ Current: ETH ${ethPct}% / USDC ${usdcPct}%` },
    { t: 1200, text: `→ Target: ETH ${ethPct}% / USDC ${usdcPct}%` },
    { t: 1600, text: `→ Drift: ${((lastEvent?.portfolioState?.maxDrift || 0) * 100).toFixed(2)}%` },
    { t: 2000, text: status?.status === 'running' ? '✓ Agent running — next check 09:00 UTC' : '→ Agent standby' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }} className="stat-grid">
        {[
          {
            label: 'Portfolio Value',
            value: `$${(lastEvent?.portfolioState?.totalUsdValue || 0).toFixed(2)}`,
            sub: 'Base Sepolia', subColor: T.textSecondary,
          },
          {
            label: 'Current Drift',
            value: `${((lastEvent?.portfolioState?.maxDrift || 0) * 100).toFixed(2)}%`,
            sub: 'From target', subColor: T.lime,
          },
          {
            label: 'Last Rebalance',
            value: lastEvent ? new Date(lastEvent.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—',
            sub: lastEvent?.decision?.tokenIn ? `${lastEvent.decision.tokenIn} → ${lastEvent.decision.tokenOut}` : 'No rebalances yet',
            subColor: T.textSecondary,
          },
          { label: 'Next Run', value: null, sub: 'Daily · 09:00 UTC', subColor: T.textSecondary, countdown: true },
        ].map(({ label, value, sub, subColor, countdown }: any) => (
          <Card key={label}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            {countdown ? <Countdown /> : <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: T.textPrimary }}>{value}</div>}
            <div style={{ fontSize: 11, color: subColor, marginTop: 4 }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Middle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }} className="middle-grid">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>Allocation Drift</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>ETH vs USDC over time</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.textPrimary }}>
                <span style={{ width: 20, height: 2, background: T.lime, display: 'inline-block', borderRadius: 2 }} /> ETH
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.textSecondary }}>
                <span style={{ width: 20, height: 2, background: T.blue, display: 'inline-block', borderRadius: 2 }} /> USDC
              </span>
            </div>
          </div>
          <RatioChart data={driftData} />
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 20, color: T.textPrimary }}>Target Allocation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutChart eth={ethPct} usdc={usdcPct} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.lime }}>{ethPct}%</div>
                <div style={{ fontSize: 9, color: T.textSecondary, fontFamily: T.mono }}>ETH</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[{ label: 'ETH', pct: ethPct, color: T.lime }, { label: 'USDC', pct: usdcPct, color: T.blue }].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color, fontWeight: 600 }}>{label}</span>
                    <span style={{ color: T.textSecondary }}>{pct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }} className="bottom-grid">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>Rebalance History</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onSimulate} style={{
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
                borderRadius: 8, padding: '6px 14px', fontSize: 11, color: T.textSecondary,
                cursor: 'pointer', fontFamily: T.sans,
              }}>◎ Simulate</button>
              <a href={`${API_BASE}/api/export/csv`} style={{
                background: T.limeDim, border: `1px solid ${T.borderAccent}`,
                borderRadius: 8, padding: '6px 14px', fontSize: 11, color: T.lime,
                textDecoration: 'none', fontFamily: T.sans,
              }}>↓ CSV</a>
            </div>
          </div>

          {simResult && (
            <div style={{ background: 'rgba(163,230,53,0.05)', border: `1px solid ${T.borderAccent}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12 }}>
              <div style={{ color: T.lime, fontWeight: 600, marginBottom: 4 }}>Simulation Result</div>
              <div style={{ color: T.textSecondary }}>
                Would rebalance: <span style={{ color: simResult.wouldRebalance ? T.lime : T.amber }}>{simResult.wouldRebalance ? 'Yes' : 'No'}</span>
                {' · '}Drift: <span style={{ color: T.textPrimary }}>{simResult.drift?.toFixed(2)}%</span>
                {' · '}{simResult.action}
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
              <thead>
                <tr>{['Date', 'Action', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: T.textSecondary, padding: '0 0 12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {history.slice(-5).reverse().map((row: any, i: number) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: '10px 0', fontSize: 12, color: T.textSecondary, fontFamily: T.mono }}>{new Date(row.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</td>
                    <td style={{ padding: '10px 0', fontSize: 12, color: T.textPrimary }}>{row.status === 'skipped' ? '—' : `${row.decision?.tokenIn} → ${row.decision?.tokenOut}`}</td>
                    <td style={{ padding: '10px 0', fontSize: 12, fontFamily: T.mono, color: T.textPrimary }}>{row.decision?.amountIn ? `${(parseInt(row.decision.amountIn) / 1e18).toFixed(4)} ETH` : '—'}</td>
                    <td style={{ padding: '10px 0' }}><Badge status={row.status} /></td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '24px 0', color: T.textSecondary, fontSize: 12, textAlign: 'center' }}>No rebalances yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card accent>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.lime, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.lime, letterSpacing: '0.08em' }}>AGENT REASONING</span>
          </div>
          <div style={{ background: '#0A0C0E', borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.border}` }}>
            <Terminal lines={agentLines} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[{ label: '0G Compute', color: T.lime }, { label: 'Uniswap', color: '#8B5CF6' }, { label: 'KeeperHub', color: T.blue }].map(({ label, color }) => (
              <span key={label} style={{ fontSize: 10, background: `${color}18`, color, border: `1px solid ${color}30`, borderRadius: 6, padding: '3px 8px' }}>{label}</span>
            ))}
          </div>
        </Card>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .middle-grid { grid-template-columns: 1fr !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}
