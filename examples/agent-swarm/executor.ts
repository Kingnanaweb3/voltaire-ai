// ─── Voltaire AI — Executor Agent (Swarm Node 2) ────────────────────────────
// Polls 0G Storage KV for rebalance signals posted by the Monitor Agent.
// When a signal is found, executes the swap via Uniswap + KeeperHub.
// Marks the signal as completed so Monitor knows it's done.
//
// Communication pattern: Monitor → 0G Storage KV → Executor
//
// Usage:
//   npx ts-node examples/agent-swarm/executor.ts

import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

import { ethers } from 'ethers';
import { KVMemory, LogMemory } from '../../core/memory';
import { readSignal, writeSignal } from './signal-bus';
import { UniswapRouter } from '../../core/router';
import { KeeperHubExecutor } from '../../core/executor';
import { v4 as uuidv4 } from 'uuid';

const kvMemory  = new KVMemory();
const logMemory = new LogMemory();
const router    = new UniswapRouter();
const executor  = new KeeperHubExecutor();

const POLL_INTERVAL_MS = 30 * 1000; // poll every 30 seconds
const WALLET_ADDRESS   = process.env.AGENT_WALLET_ADDRESS!;

// ── Poll for signals from Monitor Agent ───────────────────────────────────────
async function pollAndExecute(): Promise<void> {
  try {
    const signal = readSignal();

    // No signal or already handled
    if (!signal || signal.status !== 'pending') {
      process.stdout.write('.');
      return;
    }

    console.log(`\n[Executor] ⚡ Signal received from Monitor Agent!`);
    console.log(`[Executor] Signal ID: ${signal.id}`);
    console.log(`[Executor] Drift: ${(signal.drift * 100).toFixed(2)}% | Action: SWAP ${signal.tokenIn} → ${signal.tokenOut}`);
    console.log(`[Executor] ETH price: $${signal.ethPrice?.toFixed(2)}`);

    // ── Mark signal as processing ────────────────────────────────────────────
    writeSignal({ ...signal, status: 'processing', pickedUpAt: Date.now(), pickedUpBy: 'executor-agent' });

    try {
      // ── Calculate swap amount ──────────────────────────────────────────────
      const driftUsd   = signal.drift * signal.totalUsd;
      const amountIn   = signal.tokenIn === 'ETH'
        ? String(Math.floor(driftUsd / signal.ethPrice * 1e18))
        : String(Math.floor(driftUsd * 1e6));

      console.log(`\n[Executor] → Getting Uniswap quote...`);
      const quote = await router.getQuote({
        tokenIn:      signal.tokenIn,
        tokenOut:     signal.tokenOut,
        amountIn,
        walletAddress: WALLET_ADDRESS,
      });
      console.log(`[Executor]   ${amountIn} ${signal.tokenIn} → ${quote.amountOut} ${signal.tokenOut}`);
      console.log(`[Executor]   Route: ${quote.route} | Impact: ${quote.priceImpact}%`);

      console.log(`\n[Executor] → Building swap transaction...`);
      const unsignedTx = await router.buildSwap({ quote, walletAddress: WALLET_ADDRESS });

      console.log(`\n[Executor] → Submitting to KeeperHub...`);
      const executionId = await executor.submit(unsignedTx);

      console.log(`\n[Executor] → Waiting for confirmation...`);
      const result = await executor.waitForConfirmation(executionId);

      if (result.success) {
        console.log(`\n[Executor] ✓ Rebalance complete!`);
        console.log(`[Executor]   TX Hash: ${result.txHash}`);
        console.log(`[Executor]   Audit:   ${result.auditUrl}`);
      } else {
        console.log(`\n[Executor] ✗ Execution failed: ${result.error}`);
      }

      // ── Mark signal as completed in 0G Storage ───────────────────────────
      writeSignal({
        ...signal,
        status:      result.success ? 'completed' : 'failed',
        completedAt: Date.now(),
        executionId,
        txHash:      result.txHash,
        error:       result.error,
      });

      // ── Log full event to 0G Storage ─────────────────────────────────────
      await logMemory.append({
        id:           signal.id,
        timestamp:    Date.now(),
        source:       'executor-agent',
        triggeredBy:  'monitor-agent',
        portfolioState: {
          currentRatios: { ETH: signal.currentEth, USDC: signal.currentUsdc },
          totalUsdValue: signal.totalUsd,
          maxDrift:      signal.drift,
        },
        decision: {
          shouldSwap: true,
          tokenIn:    signal.tokenIn,
          tokenOut:   signal.tokenOut,
          amountIn,
        },
        execution: result,
        status:    result.success ? 'executed' : 'failed',
      } as any);

      console.log(`[Executor] ✓ Event logged to 0G Storage`);

    } catch (execErr: any) {
      console.error(`[Executor] Execution error: ${execErr.message}`);
      writeSignal({ ...signal, status: 'failed', error: execErr.message });
    }

  } catch (err: any) {
    // Silent poll errors
  }
}

// ── Start executor ────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║    VOLTAIRE — EXECUTOR AGENT         ║');
  console.log('║    Swarm Node 2 of 2                 ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Wallet:  ${WALLET_ADDRESS}`);
  console.log(`Channel: 0G Storage KV → rebalance_signal`);
  console.log(`Poll:    every 30 seconds\n`);

  console.log('→ Initializing KeeperHub session...');
  await executor.initialize();
  console.log('✓ KeeperHub ready\n');

  console.log('✓ Executor Agent running — watching 0G Storage for signals');
  console.log('  (dots = polling, signal will trigger automatically)\n');

  // Poll immediately then on interval
  await pollAndExecute();
  setInterval(pollAndExecute, POLL_INTERVAL_MS);
}

main().catch(console.error);
