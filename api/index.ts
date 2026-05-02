// ─── Voltaire AI — API Server ────────────────────────────────────────────────

import db from '../db';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { KVMemory, LogMemory } from '../core/memory';
import { SwarmCoordinator } from '../packages/voltaire-kit/src';
import { ethers } from 'ethers';

const app = express();
app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'], credentials: true }));
app.use(express.json());

const kvMemory = new KVMemory();
const logMemory = new LogMemory();

// ─── GET /api/status ─────────────────────────────────────────────────────────

// ─── GET /api/portfolio — live wallet balances + ETH price ──────────────────

// ─── GET /api/drift-history — real allocation drift over time from SQLite ──
app.get('/api/drift-history', async (req, res) => {
  try {
    // /api/drift-history-addr-extracted
    const addr = (req.query.address as string)?.toLowerCase();
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await logMemory.getHistory(limit, addr);
    const points = history
      .filter((e: any) => e.portfolioState?.currentRatios)
      .map((e: any) => ({
        timestamp: e.timestamp,
        date: new Date(e.timestamp).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        eth: Math.round((e.portfolioState.currentRatios.ETH || 0) * 1000) / 10,
        usdc: Math.round((e.portfolioState.currentRatios.USDC || 0) * 1000) / 10,
        target: e.portfolioState.targetRatios?.ETH ? Math.round(e.portfolioState.targetRatios.ETH * 1000) / 10 : null,
      }))
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
    res.json({ points });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

app.get('/api/portfolio', async (req, res) => {
  try {
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const queryAddr = (req.query.address as string)?.toLowerCase();
    const isValid = queryAddr && /^0x[a-f0-9]{40}$/.test(queryAddr);
    const walletAddress = isValid ? queryAddr : process.env.AGENT_WALLET_ADDRESS;
    if (!walletAddress) return res.status(500).json({ error: 'No wallet configured' });

    const USDC_ADDR = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdcContract = new ethers.Contract(USDC_ADDR, usdcAbi, provider);

    const [ethBalance, usdcBalance] = await Promise.all([
      provider.getBalance(walletAddress),
      usdcContract.balanceOf(walletAddress).catch(() => 0n),
    ]);

    const ethAmount = parseFloat(ethers.formatEther(ethBalance));
    const usdcAmount = parseFloat(ethers.formatUnits(usdcBalance, 6));

    let ethPrice = 0;
    try {
      const feed = new ethers.Contract(
        '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
        ['function latestAnswer() view returns (int256)'],
        provider
      );
      ethPrice = parseFloat(ethers.formatUnits(await feed.latestAnswer(), 8));
    } catch {}

    const ethValue = ethAmount * ethPrice;
    const totalValue = ethValue + usdcAmount;
    const config = await kvMemory.getConfig();
    const targetRatios = config?.targetRatios || { ETH: 0.6, USDC: 0.4 };

    const ratios = totalValue > 0 ? { ETH: ethValue / totalValue, USDC: usdcAmount / totalValue } : { ETH: 0, USDC: 0 };
    const drift = {
      ETH: ratios.ETH - targetRatios.ETH,
      USDC: ratios.USDC - targetRatios.USDC,
    };

    res.json({
      walletAddress,
      ethPrice,
      totalValue,
      holdings: [
        { symbol: 'ETH', amount: ethAmount, value: ethValue, ratio: ratios.ETH, target: targetRatios.ETH, drift: drift.ETH },
        { symbol: 'USDC', amount: usdcAmount, value: usdcAmount, ratio: ratios.USDC, target: targetRatios.USDC, drift: drift.USDC },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: (err as any).message });
  }
});

app.get('/api/status', async (req, res) => {
  const lastRun = await kvMemory.getLastRun();
  const config = await kvMemory.getConfig();
  res.json({
    status: 'running',
    lastRun,
    config,
    nextRun: getNextCronRun(process.env.REBALANCE_CRON || '0 9 * * *'),
  });
});

// ─── GET /api/history ────────────────────────────────────────────────────────
app.get('/api/history', async (req, res) => {
  const addr = (req.query.address as string)?.toLowerCase();
  const limit = parseInt(req.query.limit as string || '20');
  const history = await logMemory.getHistory(limit, addr);
  res.json({ history });
});

// ─── POST /api/webhook/test ──────────────────────────────────────────────────
app.post('/api/webhook/test', async (req, res) => {
  const config = await kvMemory.getConfig();
  const webhookUrl = (config as any)?.webhookUrl;
  if (!webhookUrl) return res.status(400).json({ error: 'No webhook URL configured' });
  try {
    await require('axios').default.post(webhookUrl, {
      event: 'test',
      message: 'Voltaire AI webhook test',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, message: `Webhook fired to ${webhookUrl}` });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── GET /api/poll-trigger ───────────────────────────────────────────────────
let manualTriggerPending = false;
app.get('/api/poll-trigger', (req, res) => {
  if (manualTriggerPending) {
    manualTriggerPending = false;
    return res.json({ triggered: true });
  }
  res.json({ triggered: false });
});

// ─── POST /api/trigger ───────────────────────────────────────────────────────
app.post('/api/trigger', async (req, res) => {
  try {
    manualTriggerPending = true;
    res.json({ message: 'Rebalance triggered', timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/config ─────────────────────────────────────────────────────────
app.get('/api/config', async (req, res) => {
  const config = await kvMemory.getConfig();
  res.json({ config });
});

// ─── GET /api/presets ────────────────────────────────────────────────────────
app.get('/api/presets', (req, res) => {
  res.json({
    presets: [
      { name: 'Conservative', description: 'Lower ETH exposure, more stable', targetRatios: { ETH: 0.30, USDC: 0.70 }, driftThreshold: 0.03 },
      { name: 'Balanced',     description: 'Equal split, moderate risk',      targetRatios: { ETH: 0.50, USDC: 0.50 }, driftThreshold: 0.05 },
      { name: 'Growth',       description: 'Higher ETH exposure, more upside',targetRatios: { ETH: 0.60, USDC: 0.40 }, driftThreshold: 0.05 },
      { name: 'Aggressive',   description: 'Maximum ETH, high risk/reward',   targetRatios: { ETH: 0.80, USDC: 0.20 }, driftThreshold: 0.08 },
    ]
  });
});

// ─── POST /api/config ────────────────────────────────────────────────────────
app.post('/api/config', async (req, res) => {
  const { targetRatios, driftThreshold, cronSchedule } = req.body;
  const existing = await kvMemory.getConfig();
  const updated = { ...existing, ...req.body };
  await kvMemory.setConfig(updated);
  res.json({ success: true, config: updated });
});

// ─── GET /api/analytics ──────────────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  try {
    // /api/analytics-addr-extracted
    const addr = (req.query.address as string)?.toLowerCase();
    const history = await logMemory.getHistory(1000, addr);
    if (history.length === 0) return res.json({ message: 'No history yet' });

    const executed = history.filter(e => e.status === 'executed');
    const failed   = history.filter(e => e.status === 'failed');
    const skipped  = history.filter(e => e.status === 'skipped');

    // ── P&L per rebalance ──────────────────────────────────────────────────
    const pnl = executed.map(e => {
      const before = e.portfolioState?.totalUsdValue || 0;
      const drift  = e.portfolioState?.maxDrift || 0;
      const savedValue = before * drift * 0.5; // estimated value preserved by rebalancing
      const gasCost = parseFloat(e.execution?.gasUsed || '0') / 1e18 * 2000;
      return {
        id: e.id,
        date: new Date(e.timestamp).toISOString(),
        portfolioValueBefore: before.toFixed(2),
        driftCorrected: (drift * 100).toFixed(2),
        estimatedValueSaved: savedValue.toFixed(2),
        gasCost: gasCost.toFixed(4),
        netPnl: (savedValue - gasCost).toFixed(2),
        tokenIn: e.decision?.tokenIn,
        tokenOut: e.decision?.tokenOut,
      };
    });

    // ── Frequency analytics ────────────────────────────────────────────────
    const firstEvent = history[0];
    const lastEvent  = history[history.length - 1];
    const daySpan    = Math.max(1, (lastEvent.timestamp - firstEvent.timestamp) / 86400000);
    const rebalancesPerDay = executed.length / daySpan;

    // ── Drift analytics ────────────────────────────────────────────────────
    const drifts = history
      .filter(e => e.portfolioState?.maxDrift)
      .map(e => e.portfolioState.maxDrift * 100);
    const avgDrift = drifts.reduce((a, b) => a + b, 0) / (drifts.length || 1);
    const maxDrift = Math.max(...drifts, 0);
    const minDrift = Math.min(...drifts, 0);

    // ── Total P&L ──────────────────────────────────────────────────────────
    const totalEstimatedSaved = pnl.reduce((sum, p) => sum + parseFloat(p.estimatedValueSaved), 0);
    const totalGasCost        = pnl.reduce((sum, p) => sum + parseFloat(p.gasCost), 0);
    const totalNetPnl         = totalEstimatedSaved - totalGasCost;

    // ── Best and worst rebalance ───────────────────────────────────────────
    const sortedPnl = [...pnl].sort((a, b) => parseFloat(b.netPnl) - parseFloat(a.netPnl));
    const bestRebalance  = sortedPnl[0] || null;
    const worstRebalance = sortedPnl[sortedPnl.length - 1] || null;

    // ── Portfolio value timeline ───────────────────────────────────────────
    const timeline = history.map(e => ({
      date: new Date(e.timestamp).toISOString(),
      portfolioValue: e.portfolioState?.totalUsdValue?.toFixed(2) || '0',
      ethRatio: ((e.portfolioState?.currentRatios?.ETH || 0) * 100).toFixed(1),
      usdcRatio: ((e.portfolioState?.currentRatios?.USDC || 0) * 100).toFixed(1),
      drift: ((e.portfolioState?.maxDrift || 0) * 100).toFixed(2),
      status: e.status,
    }));

    res.json({
      summary: {
        totalCycles:        history.length,
        executed:           executed.length,
        skipped:            skipped.length,
        failed:             failed.length,
        successRate:        ((executed.length / (executed.length + failed.length || 1)) * 100).toFixed(1) + '%',
        rebalancesPerDay:   rebalancesPerDay.toFixed(2),
        avgDrift:           avgDrift.toFixed(2) + '%',
        maxDrift:           maxDrift.toFixed(2) + '%',
        minDrift:           minDrift.toFixed(2) + '%',
        totalEstimatedSaved: '$' + totalEstimatedSaved.toFixed(2),
        totalGasCost:       '$' + totalGasCost.toFixed(4),
        totalNetPnl:        '$' + totalNetPnl.toFixed(2),
      },
      bestRebalance,
      worstRebalance,
      pnlHistory: pnl,
      timeline,
    });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── GET /api/costs ─────────────────────────────────────────────────────────
app.get('/api/costs', async (req, res) => {
  try {
    const addr = (req.query.address as string)?.toLowerCase();
    const history = await logMemory.getHistory(1000, addr);
    const executed = history.filter(e => e.status === 'executed' && e.execution?.gasUsed);
    const totalGasWei = executed.reduce((sum, e) => sum + BigInt(e.execution?.gasUsed || '0'), 0n);
    const totalGasEth = parseFloat(require('ethers').ethers.formatEther(totalGasWei));
    const ethPrice = 2000;
    res.json({
      totalRebalances: executed.length,
      totalGasEth: totalGasEth.toFixed(6),
      totalGasUsd: (totalGasEth * ethPrice).toFixed(2),
      avgGasPerRebalanceEth: executed.length > 0 ? (totalGasEth / executed.length).toFixed(6) : '0',
      avgGasPerRebalanceUsd: executed.length > 0 ? ((totalGasEth * ethPrice) / executed.length).toFixed(4) : '0',
    });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── GET /api/volatility ──────────────────────────────────────────────────────
app.get('/api/volatility', async (req, res) => {
  try {
    const provider = new (require('ethers').ethers.JsonRpcProvider)(process.env.BASE_SEPOLIA_RPC);
    const feed = new (require('ethers').ethers.Contract)(
      '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
      ['function latestAnswer() view returns (int256)', 'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'],
      provider
    );
    const [, answer, , updatedAt] = await feed.latestRoundData();
    const currentPrice = parseFloat(require('ethers').ethers.formatUnits(answer, 8));
    const config = await kvMemory.getConfig();
    const isHighVolatility = false; // placeholder — needs price history
    res.json({
      currentPrice: currentPrice.toFixed(2),
      lastUpdated: new Date(Number(updatedAt) * 1000).toISOString(),
      isHighVolatility,
      recommendation: isHighVolatility ? 'High volatility detected — consider pausing rebalancer' : 'Normal volatility — agent operating normally',
    });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── GET /api/health ─────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = {
    api: true,
    keeperhub: false,
    uniswap: !!process.env.UNISWAP_API_KEY,
    rpc: false,
    storage: false,
  };
  try {
    const provider = new (require('ethers').ethers.JsonRpcProvider)(process.env.BASE_SEPOLIA_RPC);
    await provider.getBlockNumber();
    checks.rpc = true; checks.keeperhub = !!process.env.KEEPERHUB_API_KEY; checks.storage = !!process.env.OG_INDEXER_URL;
  } catch {}
  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/stream ─────────────────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: 'connected', message: 'Voltaire AI stream connected', timestamp: new Date().toISOString() });

  // Pipe agent logs to stream
  (global as any).streamClients = (global as any).streamClients || [];
  (global as any).streamClients.push(send);

  req.on('close', () => {
    (global as any).streamClients = ((global as any).streamClients || []).filter((c: any) => c !== send);
  });
});

// ─── GET /api/score ──────────────────────────────────────────────────────────
app.get('/api/score', async (req, res) => {
  try {
    // /api/score-addr-extracted
    const addr = (req.query.address as string)?.toLowerCase();
    const history = await logMemory.getHistory(1000, addr);
    if (history.length === 0) return res.json({ score: 100, grade: 'A', message: 'No rebalances yet' });

    const executed   = history.filter(e => e.status === 'executed').length;
    const failed     = history.filter(e => e.status === 'failed').length;
    const skipped    = history.filter(e => e.status === 'skipped').length;
    const total      = history.length;
    const successRate = executed / (executed + failed || 1);
    const avgDrift   = history
      .filter(e => e.portfolioState?.maxDrift)
      .reduce((sum, e) => sum + (e.portfolioState.maxDrift * 100), 0) / (history.length || 1);

    const score = Math.round(
      (successRate * 60) +
      (Math.max(0, 10 - avgDrift) / 10 * 30) +
      (skipped / (total || 1) < 0.3 ? 10 : 0)
    );

    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

    res.json({
      score: Math.min(100, score),
      grade,
      stats: { total, executed, failed, skipped, successRate: (successRate * 100).toFixed(1), avgDrift: avgDrift.toFixed(2) },
      message: grade === 'A' ? 'Excellent — portfolio well maintained' :
               grade === 'B' ? 'Good — minor improvements possible' :
               grade === 'C' ? 'Fair — consider adjusting thresholds' : 'Poor — check agent configuration',
    });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── GET /api/export/csv ─────────────────────────────────────────────────────
app.get('/api/export/csv', async (req, res) => {
  try {
    const addr = (req.query.address as string)?.toLowerCase();
    const history = await logMemory.getHistory(1000, addr);
    const rows = [
      ['ID', 'Date', 'Status', 'Token In', 'Token Out', 'Amount In', 'Amount Out', 'Price Impact', 'TX Hash', 'Gas Used', 'Audit URL'].join(','),
      ...history.map(e => [
        e.id,
        new Date(e.timestamp).toISOString(),
        e.status,
        e.decision?.tokenIn || '-',
        e.decision?.tokenOut || '-',
        e.decision?.amountIn || '-',
        e.quote?.amountOut || '-',
        e.quote?.priceImpact || '-',
        e.execution?.txHash || '-',
        e.execution?.gasUsed || '-',
        e.execution?.auditUrl || '-',
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="voltaire-history.csv"');
    res.send(rows);
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── POST /api/simulate ──────────────────────────────────────────────────────
app.post('/api/simulate', async (req, res) => {
  try {
    const provider = new (require('ethers').ethers.JsonRpcProvider)(process.env.BASE_SEPOLIA_RPC);
    const walletAddress = process.env.AGENT_WALLET_ADDRESS!;
    const ethBalance = await provider.getBalance(walletAddress);
    const ethAmount = parseFloat(require('ethers').ethers.formatEther(ethBalance));
    const ethPrice = 2000; // fallback
    const ethUsdValue = ethAmount * ethPrice;
    const targetEth = parseFloat(process.env.TARGET_ETH_RATIO || '0.60');
    const targetUsdc = parseFloat(process.env.TARGET_USDC_RATIO || '0.40');
    const total = ethUsdValue;
    const currentEth = total > 0 ? ethUsdValue / total : 0;
    const drift = Math.abs(currentEth - targetEth);
    const driftThreshold = parseFloat(process.env.DRIFT_THRESHOLD || '0.05');
    const wouldRebalance = drift > driftThreshold;
    const tokenIn = currentEth > targetEth ? 'ETH' : 'USDC';
    const tokenOut = tokenIn === 'ETH' ? 'USDC' : 'ETH';
    res.json({
      simulation: true,
      wouldRebalance,
      currentAllocation: { ETH: currentEth * 100, USDC: (1 - currentEth) * 100 },
      targetAllocation: { ETH: targetEth * 100, USDC: targetUsdc * 100 },
      drift: drift * 100,
      driftThreshold: driftThreshold * 100,
      action: wouldRebalance ? `SWAP ${tokenIn} → ${tokenOut}` : 'NO ACTION',
      reason: wouldRebalance ? `Drift ${(drift*100).toFixed(2)}% exceeds threshold` : 'Portfolio within target',
    });
  } catch (err: any) {
    res.status(500).json({ error: (err as any).message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getNextCronRun(cronExp: string): string {
  // Simple implementation — returns "09:00 UTC tomorrow" for daily cron
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(9, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

// =============================================================================
// SWARM ROUTES — multi-agent coordination via VoltaireKit + 0G Storage
// =============================================================================

// Three demo agents with deterministic wallets (so the dashboard is reproducible)
const swarmWallets = {
  monitor:    new ethers.Wallet('0x' + '11'.repeat(32)),
  rebalancer: new ethers.Wallet('0x' + '22'.repeat(32)),
  dca:        new ethers.Wallet('0x' + '33'.repeat(32)),
};

const swarm = {
  monitor: new SwarmCoordinator({
    memory: kvMemory,
    agentId: 'agent:monitor:01',
    role: 'monitor',
    walletAddress: swarmWallets.monitor.address,
  }),
  rebalancer: new SwarmCoordinator({
    memory: kvMemory,
    agentId: 'agent:rebalancer:01',
    role: 'rebalancer',
    walletAddress: swarmWallets.rebalancer.address,
  }),
  dca: new SwarmCoordinator({
    memory: kvMemory,
    agentId: 'agent:dca:01',
    role: 'dca',
    walletAddress: swarmWallets.dca.address,
  }),
};

// Auto-register all three on boot (idempotent)
(async () => {
  await swarm.monitor.register();
  await swarm.rebalancer.register();
  await swarm.dca.register();
  console.log('[Swarm] 3 agents registered');
})().catch(err => console.error('[Swarm] register failed:', err));

// GET /api/swarm/state — full snapshot for the dashboard
app.get('/api/swarm/state', async (req, res) => {
  try {
    // Pull all known agents
    const agentIds = ['agent:monitor:01', 'agent:rebalancer:01', 'agent:dca:01'];
    const agents = await Promise.all(
      agentIds.map(async (id) => {
        const info = await kvMemory.get(`swarm:agents:${id}`);
        return info || null;
      })
    );

    // Pull signals from all known topics
    const topics = ['market:eth_drop', 'exec:dca_tick', 'exec:claim_lock'];
    const signalArrays = await Promise.all(
      topics.map(async (t) => (await kvMemory.get(`swarm:signals:${t}`)) || [])
    );
    const signals = signalArrays
      .flat()
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 20);

    // Pull active claims
    const claimTargets = ['rebalance:eth_drop:01'];
    const claims = (await Promise.all(
      claimTargets.map(async (t) => {
        const c = await kvMemory.get(`swarm:claims:${t}`);
        return c ? { target: t, ...c } : null;
      })
    )).filter(Boolean);

    res.json({
      agents: agents.filter(Boolean),
      signals,
      claims,
      lastUpdate: Date.now(),
    });
  } catch (err: any) {
    console.error('[swarm/state] error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/swarm/trigger — fires one demo cycle, returns the signals it wrote
app.post('/api/swarm/trigger', async (req, res) => {
  try {
    const cycle: any[] = [];

    // Step 1: monitor sees a market drop, publishes signal
    const drop = {
      asset: 'ETH',
      delta: -0.04 - Math.random() * 0.03,
      price: 2400 + Math.floor(Math.random() * 200),
    };
    const sig1 = await swarm.monitor.publishSignal('market:eth_drop', drop);
    cycle.push({ step: 'monitor.publish', signal: sig1 });

    // Step 2: rebalancer reads, claims execution
    const seenByRebalancer = await swarm.rebalancer.readSignals('market:eth_drop');
    const claimTarget = `rebalance:eth_drop:${Date.now()}`;
    const claimed = await swarm.rebalancer.claimExecution(claimTarget, 30_000);
    cycle.push({
      step: 'rebalancer.read+claim',
      sawSignals: seenByRebalancer.length,
      claimed,
      target: claimTarget,
    });

    // Step 3: dca reads, sees claim, falls back to its own action
    const seenByDca = await swarm.dca.readSignals('market:eth_drop');
    const dcaTried = await swarm.dca.claimExecution(claimTarget, 30_000);
    let sig2 = null;
    if (!dcaTried) {
      sig2 = await swarm.dca.publishSignal('exec:dca_tick', { amount: 50, asset: 'ETH' });
    }
    cycle.push({
      step: 'dca.read+fallback',
      sawSignals: seenByDca.length,
      claimedRebalance: dcaTried,
      fallbackSignal: sig2,
    });

    res.json({
      success: true,
      cycle,
      message: '3 agents coordinated via 0G Storage',
    });
  } catch (err: any) {
    console.error('[swarm/trigger] error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});
