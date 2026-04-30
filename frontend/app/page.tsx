'use client';
import { useAccount } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { T } from '@/lib/tokens';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardPage } from '@/components/pages/Dashboard';
import { PortfolioPage } from '@/components/pages/Portfolio';
import { HistoryPage } from '@/components/pages/History';
import { ConfigPage } from '@/components/pages/Config';
import { AgentLogPage } from '@/components/pages/AgentLog';

export default function Home() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [data, setData] = useState<any>({});
  const { address: connectedAddress } = useAccount();
  const [walletMode, setWalletMode] = useState<'connected' | 'agent'>('agent');

  // Auto-switch to connected mode when user connects, agent mode when they disconnect
  useEffect(() => {
    if (connectedAddress) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('voltaire:walletMode') : null;
      setWalletMode((saved === 'agent' || saved === 'connected') ? saved : 'connected');
    } else {
      setWalletMode('agent');
    }
  }, [connectedAddress]);

  // Persist mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('voltaire:walletMode', walletMode);
  }, [walletMode]);

  // Address that flows through every API call
  const effectiveAddress = walletMode === 'connected' ? connectedAddress : undefined;
  console.log('[Voltaire Debug]', { walletMode, connectedAddress, effectiveAddress });
  const [triggered, setTriggered] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [status, histRes, analytics, score, portfolio, driftHistory, volatility, health, presetsRes, configRes, costs] = await Promise.all([
      api.status(), api.history(effectiveAddress), api.analytics(effectiveAddress), api.score(effectiveAddress), api.portfolio(effectiveAddress), api.driftHistory(effectiveAddress),
      api.volatility(), api.health(), api.presets(), api.config(), api.costs(),
    ]);
    setData({
      status,
      history: histRes?.history || [],
      analytics: analytics?.message ? null : analytics,
      score,
      portfolio,
      driftHistory,
      volatility,
      health,
      presets: presetsRes?.presets || [],
      config: configRes?.config || null,
      costs,
    });
  }, [effectiveAddress]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const handleTrigger = async () => {
    setTriggered(true);
    await api.trigger();
    setTimeout(() => { setTriggered(false); loadData(); }, 2000);
  };

  const handleSimulate = async () => {
    const res = await api.simulate();
    if (res) setSimResult(res);
  };

  const handleSaveConfig = async (cfg: any) => {
    await api.saveConfig(cfg);
    await loadData();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.textPrimary, fontFamily: T.sans }}>
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} status={data.status} />
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        <Header activeNav={activeNav} status={data.status} triggered={triggered} onTrigger={handleTrigger} walletMode={walletMode} setWalletMode={setWalletMode} hasConnectedWallet={!!connectedAddress} />
        {activeNav === 'Dashboard' && <DashboardPage data={data} onSimulate={handleSimulate} simResult={simResult} />}
        {activeNav === 'Portfolio' && <PortfolioPage data={data} />}
        {activeNav === 'History' && <HistoryPage data={data} />}
        {activeNav === 'Config' && <ConfigPage data={data} onSave={handleSaveConfig} />}
        {activeNav === 'Agent Log' && <AgentLogPage data={data} />}
      </main>
    </div>
  );
}
