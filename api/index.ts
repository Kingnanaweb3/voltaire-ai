// ─── Voltaire AI — API Server ────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { KVMemory, LogMemory } from '../core/memory';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

const kvMemory = new KVMemory();
const logMemory = new LogMemory();

// ─── GET /api/status ─────────────────────────────────────────────────────────
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
  const limit = parseInt(req.query.limit as string || '20');
  const history = await logMemory.getHistory(limit);
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
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/trigger ───────────────────────────────────────────────────────
app.post('/api/trigger', async (req, res) => {
  const trigger = (global as any).instructionTrigger;
  if (!trigger) return res.status(503).json({ error: 'Agent not connected' });
  return trigger.handler(req, res);
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
  const updated = { ...existing, targetRatios, driftThreshold, cronSchedule };
  await kvMemory.setConfig(updated);
  res.json({ success: true, config: updated });
});

// ─── GET /api/costs ─────────────────────────────────────────────────────────
app.get('/api/costs', async (req, res) => {
  try {
    const history = await logMemory.getHistory(1000);
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    checks.rpc = true;
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
    const history = await logMemory.getHistory(1000);
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
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/export/csv ─────────────────────────────────────────────────────
app.get('/api/export/csv', async (req, res) => {
  try {
    const history = await logMemory.getHistory(1000);
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});
