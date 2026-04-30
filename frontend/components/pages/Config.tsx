'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { T } from '@/lib/tokens';
import { Card } from '@/components/Card';

export function ConfigPage({ data, onSave }: { data: any; onSave: (cfg: any) => Promise<void> }) {
  const { presets = [], config } = data;
  const [form, setForm] = useState<any>({
    targetRatios: { ETH: 0.6, USDC: 0.4 },
    driftThreshold: 0.05,
    cooldownHours: 0,
    maxGasGwei: 0,
    stopLossPrice: 0,
    maxPriceImpact: 1.0,
    webhookUrl: '',
    paused: false,
    trigger: {
      type: 'drift',
      driftThreshold: 0.05,
      priceDropPercent: 10,
      priceFloor: 2000,
      intervalHours: 24,
    },
  });
  const [saved, setSaved] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  useEffect(() => {
    if (config) setForm((f: any) => ({ ...f, ...config, trigger: { ...f.trigger, ...(config.trigger || {}) } }));
  }, [config]);

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testWebhook = async () => {
    const res = await api.testWebhook();
    setWebhookStatus(res?.success ? 'success' : 'failed');
    setTimeout(() => setWebhookStatus(null), 3000);
  };

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const setTrigger = (key: string, value: any) =>
    setForm((f: any) => ({ ...f, trigger: { ...f.trigger, [key]: value } }));

  const inputStyle = {
    width: '100%',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: T.textPrimary,
    fontSize: 12,
    fontFamily: T.mono,
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Presets */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Target Ratio Presets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }} className="presets-grid">
          {presets.map((p: any) => {
            const active = Math.round((form.targetRatios?.ETH || 0.6) * 100) === Math.round(p.targetRatios.ETH * 100);
            return (
              <button
                key={p.name}
                onClick={() => setForm((f: any) => ({ ...f, targetRatios: p.targetRatios, driftThreshold: p.driftThreshold }))}
                style={{
                  background: active ? T.limeDim : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? T.borderAccent : T.border}`,
                  borderRadius: 12,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: T.sans,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: active ? T.lime : T.textPrimary, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 8 }}>{p.description}</div>
                <div style={{ fontSize: 11, fontFamily: T.mono, color: T.textSecondary }}>
                  ETH {Math.round(p.targetRatios.ETH * 100)}% / USDC {Math.round(p.targetRatios.USDC * 100)}%
                </div>
              </button>
            );
          })}
          {presets.length === 0 && <div style={{ color: T.textSecondary, fontSize: 12, gridColumn: '1 / -1' }}>Loading presets...</div>}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="config-mid-grid">
        {/* Trigger */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Rebalance Trigger</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>TRIGGER TYPE</label>
              <select
                value={form.trigger?.type || 'drift'}
                onChange={(e) => setTrigger('type', e.target.value)}
                style={{ ...inputStyle, fontFamily: T.sans }}
              >
                <option value="drift">Drift exceeds threshold</option>
                <option value="price_drop">ETH drops X% in 24h</option>
                <option value="price_floor">ETH price below $X</option>
                <option value="time_based">Time-based interval</option>
              </select>
            </div>

            {/* Conditional input — drift */}
            {form.trigger?.type === 'drift' && (
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                  DRIFT THRESHOLD: {Math.round((form.trigger?.driftThreshold ?? form.driftThreshold ?? 0.05) * 100)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={Math.round((form.trigger?.driftThreshold ?? form.driftThreshold ?? 0.05) * 100)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) / 100;
                    setTrigger('driftThreshold', v);
                    set('driftThreshold', v);
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 4, fontFamily: T.mono }}>
                  Trigger when allocation drifts {'>'} threshold from target
                </div>
              </div>
            )}

            {/* Conditional input — price drop */}
            {form.trigger?.type === 'price_drop' && (
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                  ETH DROP %: {form.trigger?.priceDropPercent ?? 10}%
                </label>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={form.trigger?.priceDropPercent ?? 10}
                  onChange={(e) => setTrigger('priceDropPercent', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 4, fontFamily: T.mono }}>
                  Trigger if ETH drops {'>'} {form.trigger?.priceDropPercent ?? 10}% in 24 hours
                </div>
              </div>
            )}

            {/* Conditional input — price floor */}
            {form.trigger?.type === 'price_floor' && (
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                  ETH PRICE FLOOR ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={form.trigger?.priceFloor ?? 2000}
                  onChange={(e) => setTrigger('priceFloor', parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
                <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 4, fontFamily: T.mono }}>
                  Trigger when ETH price falls below ${form.trigger?.priceFloor ?? 2000}
                </div>
              </div>
            )}

            {/* Conditional input — time-based */}
            {form.trigger?.type === 'time_based' && (
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                  INTERVAL (HOURS): {form.trigger?.intervalHours ?? 24}
                </label>
                <input
                  type="range"
                  min="1"
                  max="168"
                  step="1"
                  value={form.trigger?.intervalHours ?? 24}
                  onChange={(e) => setTrigger('intervalHours', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 4, fontFamily: T.mono }}>
                  Run every {form.trigger?.intervalHours ?? 24} hour{(form.trigger?.intervalHours ?? 24) === 1 ? '' : 's'}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                COOLDOWN: {form.cooldownHours || 0} hours
              </label>
              <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={form.cooldownHours || 0}
                onChange={(e) => set('cooldownHours', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Card>

        {/* Protection */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: T.textPrimary }}>Protection Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>MAX GAS PRICE (GWEI) — 0 = disabled</label>
              <input
                type="number"
                value={form.maxGasGwei || 0}
                onChange={(e) => set('maxGasGwei', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>STOP-LOSS ETH PRICE ($) — 0 = disabled</label>
              <input
                type="number"
                value={form.stopLossPrice || 0}
                onChange={(e) => set('stopLossPrice', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                MAX PRICE IMPACT: {(form.maxPriceImpact || 1.0).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={form.maxPriceImpact || 1.0}
                onChange={(e) => set('maxPriceImpact', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="config-bottom-grid">
        {/* Webhook */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: T.textPrimary }}>Webhook Notifications</div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 12 }}>POST to any URL on rebalance (Zapier, Make.com, Discord)</div>
          <input
            type="text"
            placeholder="https://hooks.zapier.com/..."
            value={form.webhookUrl || ''}
            onChange={(e) => set('webhookUrl', e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <button
            onClick={testWebhook}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: T.sans,
              color: webhookStatus === 'success' ? T.lime : webhookStatus === 'failed' ? T.red : T.textSecondary,
            }}
          >
            {webhookStatus === 'success' ? '✓ Webhook fired!' : webhookStatus === 'failed' ? '✗ Failed' : 'Test webhook'}
          </button>
        </Card>

        {/* Emergency pause */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: T.textPrimary }}>Emergency Controls</div>
          <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 20 }}>Instantly halt all agent activity</div>
          <button
            onClick={() => set('paused', !form.paused)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: T.sans,
              background: form.paused ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.08)',
              color: T.red,
              border: '1px solid rgba(248,113,113,0.3)',
            }}
          >
            {form.paused ? '⏸ PAUSED — Click to Resume' : '⏹ Emergency Pause'}
          </button>
          {form.paused && (
            <div style={{ fontSize: 11, color: T.red, marginTop: 10, textAlign: 'center' }}>
              Agent is paused. No rebalances will execute.
            </div>
          )}
        </Card>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          background: saved ? T.limeDim : T.lime,
          color: saved ? T.lime : '#0E1012',
          border: saved ? `1px solid ${T.lime}` : 'none',
          borderRadius: 12,
          padding: '14px 32px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: T.sans,
          transition: 'all 0.2s ease',
          alignSelf: 'flex-start',
        }}
      >
        {saved ? '✓ Saved!' : 'Save Configuration'}
      </button>

      <style>{`
        @media (max-width: 768px) {
          .presets-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .config-mid-grid { grid-template-columns: 1fr !important; }
          .config-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
