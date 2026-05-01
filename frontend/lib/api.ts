const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch(path: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

const addrParam = (a?: string) => a ? '&address=' + a : '';
const addrFirst = (a?: string) => a ? '?address=' + a : '';

export const api = {
  status:       () => apiFetch('/api/status'),
  history: (address?: string, limit = 20) => { const url = `/api/history?limit=${limit}${addrParam(address)}`; console.log("[api.history] URL:", url, "address arg:", address); return apiFetch(url); },
  analytics:    (address?: string) => apiFetch('/api/analytics' + addrFirst(address)),
  score:        (address?: string) => apiFetch('/api/score' + addrFirst(address)),
  volatility:   () => apiFetch('/api/volatility'),
  health:       () => apiFetch('/api/health'),
  presets:      () => apiFetch('/api/presets'),
  config:       () => apiFetch('/api/config'),
  costs:        () => apiFetch('/api/costs'),
  trigger:      () => apiFetch('/api/trigger', { method: 'POST' }),
  simulate:     () => apiFetch('/api/simulate', { method: 'POST' }),
  saveConfig:   (data: any) => apiFetch('/api/config', { method: 'POST', body: JSON.stringify(data) }),
  testWebhook:  () => apiFetch('/api/webhook/test', { method: 'POST' }),
  portfolio:    (address?: string) => apiFetch('/api/portfolio' + addrFirst(address)),
  driftHistory: (address?: string) => apiFetch('/api/drift-history?limit=20' + addrParam(address)),
  swarmState:   () => apiFetch('/api/swarm/state'),
  swarmTrigger: () => apiFetch('/api/swarm/trigger', { method: 'POST' }),
};
