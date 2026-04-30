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
  const [triggered, setTriggered] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [status, histRes, analytics, score, portfolio, driftHistory, volatility, health, presetsRes, configRes, costs] = await Promise.all([
      api.status(), api.history(), api.analytics(), api.score(), api.portfolio(connectedAddress), api.driftHistory(),
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
  }, [connectedAddress]);

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
        <Header activeNav={activeNav} status={data.status} triggered={triggered} onTrigger={handleTrigger} />
        {activeNav === 'Dashboard' && <DashboardPage data={data} onSimulate={handleSimulate} simResult={simResult} />}
        {activeNav === 'Portfolio' && <PortfolioPage data={data} />}
        {activeNav === 'History' && <HistoryPage data={data} />}
        {activeNav === 'Config' && <ConfigPage data={data} onSave={handleSaveConfig} />}
        {activeNav === 'Agent Log' && <AgentLogPage data={data} />}
      </main>
    </div>
  );
}
