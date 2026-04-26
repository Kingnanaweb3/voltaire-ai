// ─── Voltaire AI — Trigger Module ───────────────────────────────────────────
// Three trigger types: scheduled (cron), condition-based, instruction-based.
// All implement ITrigger — wire any trigger to any agent.

import cron from 'node-cron';
import { PortfolioState } from '../types';

export type TriggerCallback = () => Promise<void>;

export interface ITrigger {
  start(callback: TriggerCallback): void;
  stop(): void;
}

// ─── Scheduled Trigger — fires on cron schedule ──────────────────────────────
export class ScheduledTrigger implements ITrigger {
  private schedule: string;
  private task: cron.ScheduledTask | null = null;

  constructor(schedule?: string) {
    this.schedule = schedule || process.env.REBALANCE_CRON || '0 9 * * *';
  }

  start(callback: TriggerCallback): void {
    console.log(`[ScheduledTrigger] Starting — schedule: ${this.schedule}`);
    this.task = cron.schedule(this.schedule, async () => {
      console.log(`[ScheduledTrigger] Fired at ${new Date().toISOString()}`);
      await callback();
    });
  }

  stop(): void {
    this.task?.stop();
    console.log('[ScheduledTrigger] Stopped');
  }
}

// ─── Condition Trigger — fires when drift exceeds threshold ──────────────────
export class ConditionTrigger implements ITrigger {
  private threshold: number;
  private pollIntervalMs: number;
  private getState: () => Promise<PortfolioState>;
  private interval: NodeJS.Timeout | null = null;

  constructor(
    getState: () => Promise<PortfolioState>,
    threshold?: number,
    pollIntervalMs = 60_000
  ) {
    this.getState = getState;
    this.threshold = threshold || parseFloat(process.env.DRIFT_THRESHOLD || '0.05');
    this.pollIntervalMs = pollIntervalMs;
  }

  start(callback: TriggerCallback): void {
    console.log(`[ConditionTrigger] Starting — threshold: ${this.threshold * 100}%`);
    this.interval = setInterval(async () => {
      const state = await this.getState();
      if (state.maxDrift > this.threshold) {
        console.log(`[ConditionTrigger] Drift ${(state.maxDrift * 100).toFixed(2)}% exceeds threshold — firing`);
        await callback();
      }
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    console.log('[ConditionTrigger] Stopped');
  }
}

// ─── Instruction Trigger — fires on REST API call ────────────────────────────
// Register this with Express: app.post('/api/trigger', instructionTrigger.handler)
export class InstructionTrigger implements ITrigger {
  private callback: TriggerCallback | null = null;

  start(callback: TriggerCallback): void {
    this.callback = callback;
    console.log('[InstructionTrigger] Ready — POST /api/trigger to fire');
  }

  stop(): void {
    this.callback = null;
  }

  // Use this as Express route handler
  get handler() {
    return async (req: any, res: any) => {
      if (!this.callback) {
        return res.status(503).json({ error: 'Agent not running' });
      }
      res.json({ message: 'Rebalance triggered', timestamp: Date.now() });
      await this.callback(); // fire after responding
    };
  }
}
