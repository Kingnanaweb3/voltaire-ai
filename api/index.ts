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

// ─── POST /api/config ────────────────────────────────────────────────────────
app.post('/api/config', async (req, res) => {
  const { targetRatios, driftThreshold, cronSchedule } = req.body;
  const existing = await kvMemory.getConfig();
  const updated = { ...existing, targetRatios, driftThreshold, cronSchedule };
  await kvMemory.setConfig(updated);
  res.json({ success: true, config: updated });
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
