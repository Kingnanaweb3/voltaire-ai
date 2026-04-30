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

export const api = {
  status:     () => apiFetch('/api/status'),
  portfolio: (address?: string) => apiFetch('/api/portfolio' + (address ? '?address=' + address : '')),
  driftHistory: () => apiFetch('/api/drift-history?limit=20'),
  history:    (limit = 20) => apiFetch(`/api/history?limit=${limit}`),
  analytics:  () => apiFetch('/api/analytics'),
  score:      () => apiFetch('/api/score'),
  volatility: () => apiFetch('/api/volatility'),
  health:     () => apiFetch('/api/health'),
  presets:    () => apiFetch('/api/presets'),
  config:     () => apiFetch('/api/config'),
  costs:      () => apiFetch('/api/costs'),
  trigger:    () => apiFetch('/api/trigger', { method: 'POST' }),
  simulate:   () => apiFetch('/api/simulate', { method: 'POST' }),
  saveConfig: (data: any) => apiFetch('/api/config', { method: 'POST', body: JSON.stringify(data) }),
  testWebhook: () => apiFetch('/api/webhook/test', { method: 'POST' }),
};
