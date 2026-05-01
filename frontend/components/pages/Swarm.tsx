'use client';
import { useEffect, useState, useRef } from 'react';
import { T } from '@/lib/tokens';
import { api } from '@/lib/api';

interface SwarmAgent {
  agentId: string;
  role: string;
  walletAddress: string;
  registeredAt: number;
}

interface SwarmSignal {
  id: string;
  topic: string;
  agentId: string;
  payload: any;
  timestamp: number;
  txSeq?: string;
}

interface SwarmClaim {
  target: string;
  agentId: string;
  claimedAt: number;
  expiresAt: number;
}

interface SwarmState {
  agents: SwarmAgent[];
  signals: SwarmSignal[];
  claims: SwarmClaim[];
  lastUpdate: number;
}

const ROLE_META: Record<string, { label: string; emoji: string; color: keyof typeof T }> = {
  monitor:    { label: 'Monitor',    emoji: '👁',  color: 'blue' },
  rebalancer: { label: 'Rebalancer', emoji: '⚖',  color: 'lime' },
  dca:        { label: 'DCA Agent',  emoji: '◎',  color: 'purple' },
};

const TOPIC_LABEL: Record<string, string> = {
  'market:eth_drop': 'market signal',
  'exec:dca_tick':   'dca execution',
  'exec:claim_lock': 'claim lock',
};

function shortAddr(a: string) {
  if (!a) return '';
  return a.slice(0, 6) + '...' + a.slice(-4);
}

function relativeTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 3600) + 'h ago';
}

export function SwarmPage() {
  const [state, setState] = useState<SwarmState | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [lastSignalCount, setLastSignalCount] = useState(0);
  const [pulseAgent, setPulseAgent] = useState<string | null>(null);

  // Poll /api/swarm/state every 2s
  useEffect(() => {
    let cancelled = false;
    const fetchState = async () => {
      try {
        const data = await api.swarmState();
        if (cancelled) return;
        setState(data);
        setLoading(false);
        // Detect new signals → flash the agent that published
        if (data.signals && data.signals.length > lastSignalCount && lastSignalCount > 0) {
          const newest = data.signals[0];
          setPulseAgent(newest.agentId);
          setTimeout(() => setPulseAgent(null), 1500);
        }
        setLastSignalCount(data.signals?.length || 0);
      } catch (err) {
        console.error('swarm fetch failed:', err);
      }
    };
    fetchState();
    const id = setInterval(fetchState, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [lastSignalCount]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.swarmTrigger();
      // Force immediate refetch
      const data = await api.swarmState();
      setState(data);
    } catch (err) {
      console.error('trigger failed:', err);
    } finally {
      setTimeout(() => setTriggering(false), 800);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.textSecondary, fontFamily: T.mono, fontSize: 13 }}>
        loading swarm state...
      </div>
    );
  }

  if (!state) return null;

  const agents = state.agents || [];
  const signals = state.signals || [];
  const claims = state.claims || [];
  const activeClaim = claims.find(c => c.expiresAt > Date.now());

  return (
    <div className="swarm-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* HERO SECTION */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 11, fontFamily: T.mono, color: T.lime,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          VoltaireKit · Swarm Coordination
        </div>
        <h2 style={{
          fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: T.textPrimary,
          margin: 0, marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          Three agents. One wallet. Zero collisions.
        </h2>
        <p style={{
          fontSize: 14, color: T.textSecondary, margin: 0, marginBottom: 20,
          maxWidth: 640, lineHeight: 1.5,
        }}>
          Multi-agent coordination via 0G Storage. No central server. No message broker.
          Agents publish signals, claim execution, and gracefully fall back — all through verifiable shared memory.
        </p>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="btn-trigger"
          style={{
            background: triggering ? T.limeDim : T.lime,
            color: '#0D0F12',
            border: 'none',
            borderRadius: 100,
            padding: '11px 24px',
            fontFamily: T.sans,
            fontWeight: 600,
            fontSize: 14,
            cursor: triggering ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: triggering ? 'none' : `0 4px 16px ${T.limeGlow}`,
          }}
        >
          {triggering ? '⟳ coordinating...' : '▶ Trigger Demo Cycle'}
        </button>
      </div>

      {/* AGENT FLOW DIAGRAM */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 28,
      }}>
        <div style={{
          fontSize: 11, fontFamily: T.mono, color: T.textSecondary,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24,
        }}>
          Live Swarm — {agents.length} agents online
        </div>

        <div className="agent-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          position: 'relative',
        }}>
          {agents.map(agent => {
            const role = agent.role;
            const meta = ROLE_META[role] || ROLE_META.monitor;
            const isClaimer = activeClaim?.agentId === agent.agentId;
            const isPulsing = pulseAgent === agent.agentId;
            const accentColor = meta.color === 'lime' ? T.lime
                              : meta.color === 'blue' ? T.blue
                              : meta.color === 'purple' ? T.purple
                              : T.textSecondary;
            return (
              <div key={agent.agentId} style={{
                background: T.card,
                border: `1px solid ${isPulsing ? accentColor : T.border}`,
                borderRadius: 14,
                padding: 20,
                position: 'relative',
                transition: 'all 0.3s',
                transform: isPulsing ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isPulsing ? `0 0 24px ${accentColor}40` : 'none',
              }}>
                {/* Status dot */}
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 10, fontFamily: T.mono, color: T.textSecondary,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: accentColor,
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }} />
                  online
                </div>

                <div style={{ fontSize: 28, marginBottom: 8 }}>{meta.emoji}</div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: T.textPrimary,
                  marginBottom: 4, fontFamily: T.sans,
                }}>
                  {meta.label}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: T.mono, color: T.textSecondary,
                  marginBottom: 12,
                }}>
                  {agent.agentId}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: T.mono, color: T.textMuted,
                  paddingTop: 12, borderTop: `1px solid ${T.border}`,
                }}>
                  {shortAddr(agent.walletAddress)}
                </div>

                {isClaimer && (
                  <div style={{
                    marginTop: 12, padding: '6px 10px',
                    background: T.limeDim, border: `1px solid ${T.borderAccent}`,
                    borderRadius: 8, fontSize: 10, fontFamily: T.mono,
                    color: T.limeText, letterSpacing: '0.05em',
                  }}>
                    🔒 holds execution claim
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signal flow caption */}
        <div style={{
          marginTop: 20, fontSize: 11, fontFamily: T.mono,
          color: T.textSecondary, textAlign: 'center',
        }}>
          ─── signals flow through 0G Storage ───
        </div>
      </div>

      {/* SIGNAL LOG */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 28,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11, fontFamily: T.mono, color: T.textSecondary,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Recent Signals — {signals.length} on shared whiteboard
          </div>
          <div style={{
            fontSize: 10, fontFamily: T.mono, color: T.textMuted,
          }}>
            updates every 2s
          </div>
        </div>

        {signals.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center',
            color: T.textSecondary, fontSize: 13, fontFamily: T.mono,
          }}>
            no signals yet — click "Trigger Demo Cycle" above to fire one
          </div>
        ) : (
          <div className="signal-log" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signals.map((sig, idx) => {
              const role = sig.agentId.split(':')[1];
              const meta = ROLE_META[role] || ROLE_META.monitor;
              const accentColor = meta.color === 'lime' ? T.lime
                                : meta.color === 'blue' ? T.blue
                                : meta.color === 'purple' ? T.purple
                                : T.textSecondary;
              return (
                <div key={sig.id} className="signal-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 110px 1fr auto',
                  gap: 16, alignItems: 'center',
                  padding: '10px 14px',
                  background: idx === 0 ? T.limeGlow : T.card,
                  border: `1px solid ${idx === 0 ? T.borderAccent : T.border}`,
                  borderRadius: 10,
                  fontSize: 12, fontFamily: T.mono,
                  transition: 'all 0.3s',
                }}>
                  <div style={{ color: T.textSecondary }}>
                    {relativeTime(sig.timestamp)}
                  </div>
                  <div style={{
                    color: accentColor, fontWeight: 600,
                  }}>
                    {meta.label.toLowerCase()}
                  </div>
                  <div style={{ color: T.textPrimary }}>
                    <span style={{ color: T.textSecondary }}>topic:</span>{' '}
                    {TOPIC_LABEL[sig.topic] || sig.topic}
                  </div>
                  <div style={{ fontSize: 10 }}>
                    {sig.txSeq ? (
                      <a
                        href={`https://storagescan-galileo.0g.ai/submission/${sig.txSeq}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`0G Storage txSeq: ${sig.txSeq}`}
                        style={{
                          color: T.lime,
                          textDecoration: 'none',
                          borderBottom: `1px dashed ${T.lime}`,
                          fontFamily: T.mono,
                        }}
                      >
                        ↗ 0G txSeq
                      </a>
                    ) : (
                      <span style={{ color: T.textMuted, fontFamily: T.mono }}>
                        {sig.id.split(':').pop()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 28,
      }}>
        <div style={{
          fontSize: 11, fontFamily: T.mono, color: T.textSecondary,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
        }}>
          How it works
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          fontSize: 14, color: T.textPrimary, lineHeight: 1.6,
        }}>
          <div><span style={{ color: T.blue, fontWeight: 600 }}>1. Monitor</span> watches market conditions and publishes a signal to the shared 0G Storage namespace.</div>
          <div><span style={{ color: T.lime, fontWeight: 600 }}>2. Rebalancer</span> reads the signal and tries to claim execution. First successful claim wins.</div>
          <div><span style={{ color: T.purple, fontWeight: 600 }}>3. DCA Agent</span> reads the same signal, sees the claim is taken, and gracefully runs its own non-conflicting action.</div>
          <div style={{
            marginTop: 8, paddingTop: 14, borderTop: `1px solid ${T.border}`,
            fontSize: 12, color: T.textSecondary,
          }}>
            All state changes are written to 0G Storage with verifiable txSeq proofs. Try it on{' '}
            <a href="https://github.com/Kingnanaweb3/voltaire-ai/tree/main/packages/voltaire-kit"
               target="_blank" rel="noopener noreferrer"
               style={{ color: T.lime, textDecoration: 'none', borderBottom: `1px solid ${T.lime}` }}>
              VoltaireKit
            </a>
            .
          </div>
        </div>
      </div>

      {/* Animations + responsive */}
      <style jsx global>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @media (max-width: 768px) {
          .agent-grid { grid-template-columns: 1fr !important; }
          .signal-row { grid-template-columns: 80px 1fr !important; gap: 8px !important; }
          .signal-row > div:nth-child(2) { display: none; }
          .signal-row > div:nth-child(4) { display: none; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .agent-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
