'use client';
import { useEffect, useState } from 'react';
import { T } from '@/lib/tokens';
import { Card } from '@/components/Card';
import { Terminal } from '@/components/Terminal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function AgentLogPage({ data }: { data: any }) {
  const { health } = data;
  const [streamLines, setStreamLines] = useState<string[]>([]);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        setStreamLines(l => [...l.slice(-50), d.message || JSON.stringify(d)]);
      } catch {}
    };
    es.onerror = () => {
      setStreamLines(l => [...l, '→ Stream disconnected — retrying...']);
    };
    return () => es.close();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Health */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>System Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }} className="health-grid">
          {health?.checks ? Object.entries(health.checks).map(([key, ok]: any) => (
            <div key={key} style={{
              background: ok ? T.limeDim : 'rgba(248,113,113,0.1)',
              border: `1px solid ${ok ? T.borderAccent : 'rgba(248,113,113,0.3)'}`,
              borderRadius: 10, padding: '12px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4, color: ok ? T.lime : T.red }}>{ok ? '✓' : '✗'}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: ok ? T.lime : T.red, textTransform: 'uppercase' }}>{key}</div>
            </div>
          )) : (
            <div style={{ color: T.textSecondary, fontSize: 12, gridColumn: '1 / -1' }}>Loading health status...</div>
          )}
        </div>
        {health && (
          <div style={{ marginTop: 12, fontSize: 11, color: T.textSecondary }}>
            Status: <span style={{ color: health.status === 'healthy' ? T.lime : T.amber }}>{health.status}</span>
            {' · '}{health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : ''}
          </div>
        )}
      </Card>

      {/* Live stream */}
      <Card accent>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.lime, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: T.lime, letterSpacing: '0.08em' }}>LIVE AGENT STREAM</span>
          <span style={{ fontSize: 10, color: T.textSecondary, marginLeft: 'auto' }}>SSE · /api/stream</span>
        </div>
        <div style={{ background: '#0A0C0E', borderRadius: 10, padding: '16px', border: `1px solid ${T.border}`, minHeight: 200 }}>
          <Terminal lines={streamLines.length > 0 ? streamLines : ['→ Connecting to agent stream...']} live />
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Integrations</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }} className="integrations-grid">
          {[
            { name: '0G Compute', desc: 'LLM brain / decision engine', color: T.lime, status: 'Fallback active' },
            { name: '0G Storage', desc: 'Audit log + KV memory', color: T.lime, status: 'Connected' },
            { name: 'Uniswap API', desc: 'Quote + swap execution', color: '#8B5CF6', status: 'Connected' },
            { name: 'KeeperHub', desc: 'Guaranteed execution', color: T.blue, status: 'Connected' },
            { name: 'Chainlink', desc: 'Live ETH/USD price feed', color: T.amber, status: 'Connected' },
            { name: 'Base Sepolia', desc: 'EVM testnet', color: '#F97316', status: 'Connected' },
          ].map(({ name, desc, color, status }) => (
            <div key={name} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 8 }}>{desc}</div>
              <span style={{ fontSize: 10, background: `${color}18`, color, border: `1px solid ${color}30`, borderRadius: 6, padding: '2px 8px' }}>{status}</span>
            </div>
          ))}
        </div>
      </Card>

      <style>{`
        @media (max-width: 768px) {
          .health-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .integrations-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 480px) {
          .health-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .integrations-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
