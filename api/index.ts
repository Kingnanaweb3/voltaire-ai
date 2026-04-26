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
