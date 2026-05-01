'use client';
import { T } from '@/lib/tokens';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function HistoryPage({ data, walletMode, setWalletMode }: { data: any; walletMode: 'connected' | 'agent'; setWalletMode: (m: 'connected' | 'agent') => void }) {
  const { history = [] } = data;

  const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary }}>Full Rebalance History</div>
            <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>
              All on-chain · click TX to view on Base Sepolia explorer
            </div>
          </div>
          <a
            href={`${API_BASE}/api/export/csv`}
            style={{
              background: T.limeDim,
              border: `1px solid ${T.borderAccent}`,
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 11,
              color: T.lime,
              textDecoration: 'none',
            }}
          >
            ↓ Download CSV
          </a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                {['Date', 'Action', 'In', 'Out', 'Drift', 'Gas (USD)', 'Audit', 'Retries', 'TX', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 10,
                      color: T.textSecondary,
                      padding: '0 0 12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice().reverse().map((row: any, i: number) => {
                const txHash = row.execution?.txHash;
                const gasUsd = row.execution?.gasUsedUsd ?? row.execution?.gasCostUsd;
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: '12px 0', fontSize: 12, color: T.textSecondary, fontFamily: T.mono }}>
                      {new Date(row.timestamp).toLocaleString('en', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, color: T.textPrimary }}>
                      {row.status === 'skipped' ? 'No action' : 'Swap'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono, color: T.lime }}>
                      {row.decision?.tokenIn || '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono, color: T.blue }}>
                      {row.decision?.tokenOut || '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono, color: T.textSecondary }}>
                      {row.portfolioState?.maxDrift
                        ? `${(row.portfolioState.maxDrift * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono, color: T.amber }}>
                      {gasUsd != null ? `${Number(gasUsd).toFixed(4)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono }}>
                      {row.execution?.auditUrl ? (<a
                        
                          href={row.execution.auditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="keeperhub-audit-link"
                          style={{
                            color: T.purple,
                            textDecoration: 'none',
                            borderBottom: `1px dashed ${T.purple}80`,
                            fontSize: 11,
                          }}
                          title="View execution on KeeperHub"
                        >
                          KeeperHub ↗
                        </a>
                      ) : (
                        <span style={{ color: T.textMuted }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 11, fontFamily: T.mono, color: T.textSecondary, textAlign: 'center' }}>
                      {row.execution?.retryCount != null ? row.execution.retryCount : '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, fontFamily: T.mono }}>
                      {txHash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: T.lime,
                            textDecoration: 'none',
                            borderBottom: `1px dashed ${T.lime}`,
                            paddingBottom: 1,
                          }}
                          title={txHash}
                        >
                          {shortHash(txHash)} ↗
                        </a>
                      ) : (
                        <span style={{ color: T.textSecondary }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <Badge status={row.status} />
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px 0', textAlign: 'center' }}>
                  {walletMode === 'connected' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 14, color: T.textPrimary, fontWeight: 600 }}>🤖 Your wallet isn't managed by Voltaire yet</div>
                      <div style={{ fontSize: 12, color: T.textSecondary, maxWidth: 380 }}>Voltaire is an autonomous rebalancing agent. Connect this wallet to the agent to enable automated portfolio management, or explore the live demo running on the agent's wallet.</div>
                      <button onClick={() => setWalletMode('agent')} style={{ marginTop: 6, background: T.limeDim, color: T.lime, border: `1px solid ${T.lime}40`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Agent Demo →</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: T.textSecondary }}>No history yet</div>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
