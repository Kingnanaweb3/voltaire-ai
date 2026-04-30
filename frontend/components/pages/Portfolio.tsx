'use client';
import { T } from '@/lib/tokens';
import { Card } from '@/components/Card';

export function PortfolioPage({ data }: { data: any }) {
  const { analytics, volatility, score, costs, portfolio } = data;
  const summary = analytics?.summary;
  const holdings = portfolio?.holdings || [];
  const totalValue = portfolio?.totalValue || 0;

  // Strip stray % from analytics summary values (defensive — backend sometimes adds it)
  const fmtPct = (v: any) => {
    if (v == null) return '—';
    const s = String(v).replace(/%/g, '');
    return `${s}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── HOLDINGS — Live wallet view ───────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, marginBottom: 4 }}>Current Holdings</div>
            <div style={{ fontSize: 11, color: T.textSecondary }}>Live on-chain balances · Base Sepolia</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>TOTAL VALUE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.lime, fontFamily: T.mono, letterSpacing: '-0.02em' }}>
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        {holdings.length === 0 ? (
          <div style={{ color: T.textSecondary, fontSize: 12, padding: '24px 0', textAlign: 'center' }}>
            Loading wallet balances...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {holdings.map((h: any) => {
              const driftPct = (h.drift * 100);
              const isOver = driftPct > 0.5;
              const isUnder = driftPct < -0.5;
              const driftColor = isOver ? T.amber : isUnder ? T.blue : T.lime;
              const driftLabel = isOver ? `+${driftPct.toFixed(1)}% over` : isUnder ? `${driftPct.toFixed(1)}% under` : 'on target';
              return (
                <div key={h.symbol} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 110px 110px 130px',
                  gap: 16,
                  alignItems: 'center',
                }} className="holding-row">
                  {/* Symbol */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: h.symbol === 'ETH' ? 'rgba(163,230,53,0.15)' : 'rgba(96,165,250,0.15)',
                      color: h.symbol === 'ETH' ? T.lime : T.blue,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: T.sans, fontWeight: 700, fontSize: 12,
                    }}>{h.symbol[0]}</div>
                    <div>
                      <div style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{h.symbol}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textSecondary }}>
                        {h.symbol === 'ETH' ? `$${(h.value / Math.max(h.amount, 0.000001)).toFixed(0)} / ETH` : '$1.00 / USDC'}
                      </div>
                    </div>
                  </div>

                  {/* Allocation bars */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textSecondary, marginBottom: 4, fontFamily: T.mono }}>
                      <span>CURRENT {(h.ratio * 100).toFixed(1)}%</span>
                      <span>TARGET {(h.target * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${h.ratio * 100}%`, height: '100%', background: h.symbol === 'ETH' ? T.lime : T.blue, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      <div style={{ position: 'absolute', left: `${h.target * 100}%`, top: -2, bottom: -2, width: 2, background: T.textSecondary, opacity: 0.5 }} />
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: T.textSecondary, marginBottom: 2 }}>BALANCE</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
                      {h.symbol === 'ETH' ? h.amount.toFixed(4) : h.amount.toFixed(2)} {h.symbol}
                    </div>
                  </div>

                  {/* Value */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: T.textSecondary, marginBottom: 2 }}>VALUE</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
                      ${h.value.toFixed(2)}
                    </div>
                  </div>

                  {/* Drift badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block',
                      fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                      color: driftColor,
                      background: `${driftColor}15`,
                      border: `1px solid ${driftColor}30`,
                      borderRadius: 6,
                      padding: '4px 10px',
                    }}>
                      {driftLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }} className="portfolio-stat-grid">
        {[
          { label: 'Health Score', value: score ? `${score.score}/100` : '—', sub: score?.grade ? `Grade ${score.grade} · synthetic estimate` : 'No data yet', color: T.lime },
          { label: 'Total Cycles', value: summary?.totalCycles ?? '—', sub: `${summary?.executed || 0} executed · ${summary?.failed || 0} failed`, color: T.textPrimary },
        ].map(({ label, value, sub, color }: any) => (
          <Card key={label}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>{sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="portfolio-mid-grid">
        {/* Stats */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Rebalance Statistics</div>
          {summary ? (
            <div>
              {[
                { label: 'Total Cycles', value: summary.totalCycles },
                { label: 'Executed', value: summary.executed },
                { label: 'Skipped', value: summary.skipped },
                { label: 'Failed', value: summary.failed },
                { label: 'Success Rate', value: summary.successRate },
                { label: 'Max Drift Seen', value: fmtPct(summary.maxDrift) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, padding: '12px 0' }}>
                  <span style={{ fontSize: 12, color: T.textSecondary }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textPrimary }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: T.textSecondary, fontSize: 12 }}>Run the agent to see stats</div>
          )}
        </Card>

        {/* Volatility */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: T.textPrimary }}>ETH Price & Volatility</div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 16 }}>Live from Chainlink oracle</div>
          {volatility ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.lime, fontFamily: T.mono }}>
                ${parseFloat(volatility.currentPrice).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary }}>
                Updated: {volatility.lastUpdated ? new Date(volatility.lastUpdated).toLocaleTimeString() : '—'}
              </div>
              </div>
          ) : (
            <div style={{ color: T.textSecondary, fontSize: 12 }}>Loading price data...</div>
          )}
        </Card>
      </div>

      {/* Performance score bar */}
      {score && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Performance Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${T.lime}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.lime }}>{score.grade}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 8, marginBottom: 8 }}>
                <div style={{ width: `${score.score}%`, height: '100%', background: T.lime, borderRadius: 8, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{score.message}</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.lime, fontFamily: T.mono }}>{score.score}</div>
          </div>
        </Card>
      )}

      <style>{`
        @media (max-width: 900px) {
          .holding-row { grid-template-columns: 1fr !important; gap: 8px !important; }
          .holding-row > div:nth-child(n+3) { text-align: left !important; }
        }
        @media (max-width: 768px) {
          .portfolio-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .portfolio-mid-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
