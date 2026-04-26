// ─── Voltaire AI — Rebalancer Agent ─────────────────────────────────────────
// Sequential agent loop — all four integrations wired.
// LangGraph can be added later once version is confirmed.

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { ethers } from 'ethers';
import { OGComputeBrain } from '../../core/brain';
import { KVMemory, LogMemory } from '../../core/memory';
import { UniswapRouter, TOKENS } from '../../core/router';
import { KeeperHubExecutor } from '../../core/executor';
import { ScheduledTrigger, InstructionTrigger } from '../../core/trigger';
import { PortfolioState, SwapDecision, RebalanceEvent } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';

const brain     = new OGComputeBrain();
const kvMemory  = new KVMemory();
const logMemory = new LogMemory();
const router    = new UniswapRouter();
const executor  = new KeeperHubExecutor();

// ── Step 1: Fetch balances ────────────────────────────────────────────────────
async function fetchPortfolio(): Promise<PortfolioState> {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
  const walletAddress = process.env.AGENT_WALLET_ADDRESS!;
  const targetRatios = {
    ETH:  parseFloat(process.env.TARGET_ETH_RATIO  || '0.60'),
    USDC: parseFloat(process.env.TARGET_USDC_RATIO || '0.40'),
  };

  const ethBalance = await provider.getBalance(walletAddress);
  const ethAmount  = parseFloat(ethers.formatEther(ethBalance));

  const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
  const usdcContract = new ethers.Contract(TOKENS.USDC, usdcAbi, provider);
  let usdcAmount = 0;
  try {
    const raw  = await usdcContract.balanceOf(walletAddress);
    usdcAmount = parseFloat(ethers.formatUnits(raw, 6));
  } catch { console.warn('  [step1] USDC read failed — using 0'); }

  const ethPrice      = 3000;
  const ethUsdValue   = ethAmount * ethPrice;
  const usdcUsdValue  = usdcAmount;
  const totalUsdValue = ethUsdValue + usdcUsdValue;

  const currentRatios = totalUsdValue > 0
    ? { ETH: ethUsdValue / totalUsdValue, USDC: usdcUsdValue / totalUsdValue }
    : { ETH: 0, USDC: 0 };

  const driftAmounts = {
    ETH:  currentRatios.ETH  - targetRatios.ETH,
    USDC: currentRatios.USDC - targetRatios.USDC,
  };

  const maxDrift = Math.max(...Object.values(driftAmounts).map(Math.abs));

  return {
    walletAddress,
    balances: [
      { symbol: 'ETH',  address: TOKENS.ETH,  amount: ethBalance.toString(),    decimals: 18, usdValue: ethUsdValue  },
      { symbol: 'USDC', address: TOKENS.USDC, amount: String(usdcAmount * 1e6), decimals: 6,  usdValue: usdcUsdValue },
    ],
    totalUsdValue, currentRatios, targetRatios, driftAmounts, maxDrift,
    timestamp: Date.now(),
  };
}

// ── Step 2: Decide ────────────────────────────────────────────────────────────
async function makeDecision(portfolio: PortfolioState): Promise<SwapDecision> {
  try {
    return await brain.decide(portfolio);
  } catch {
    console.warn('  [step2] Brain unavailable — threshold fallback');
    const threshold = parseFloat(process.env.DRIFT_THRESHOLD || '0.05');
    const shouldSwap = portfolio.maxDrift > threshold;
    const overEntry  = Object.entries(portfolio.driftAmounts).find(([, d]) => d > 0);
    const tokenIn    = overEntry?.[0] || 'ETH';
    const tokenOut   = tokenIn === 'ETH' ? 'USDC' : 'ETH';
    const amountIn   = shouldSwap && overEntry
      ? String(Math.floor(Math.abs(overEntry[1]) * portfolio.totalUsdValue / 3000 * 1e18))
      : '0';
    return {
      shouldSwap, tokenIn, tokenOut, amountIn,
      reasoning: shouldSwap
        ? `Drift ${(portfolio.maxDrift * 100).toFixed(2)}% exceeds threshold`
        : `Drift ${(portfolio.maxDrift * 100).toFixed(2)}% — no action needed`,
      confidence: 0.8,
    };
  }
}

// ── Main rebalance cycle ──────────────────────────────────────────────────────
async function runRebalance(): Promise<void> {
  const runId = uuidv4().slice(0, 8);
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  VOLTAIRE — Rebalance Cycle [${runId}]  ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`  ${new Date().toISOString()}\n`);

  const event: Partial<RebalanceEvent> = { id: runId, timestamp: Date.now() };

  try {
    // ── Step 1: Fetch ─────────────────────────────────────────────────────
    console.log('→ Step 1: Fetching portfolio state...');
    const portfolio = await fetchPortfolio();
    event.portfolioState = portfolio;
    console.log(`  ETH ${(portfolio.currentRatios.ETH * 100).toFixed(1)}% | USDC ${(portfolio.currentRatios.USDC * 100).toFixed(1)}% | Drift ${(portfolio.maxDrift * 100).toFixed(2)}% | $${portfolio.totalUsdValue.toFixed(2)}`);

    // ── Step 2: Decide ────────────────────────────────────────────────────
    console.log('\n→ Step 2: Asking brain for decision...');
    const decision = await makeDecision(portfolio);
    event.decision = decision;
    console.log(`  Decision: ${decision.shouldSwap ? `SWAP ${decision.tokenIn} → ${decision.tokenOut}` : 'NO ACTION'}`);
    console.log(`  Reasoning: ${decision.reasoning}`);

    if (!decision.shouldSwap) {
      event.status = 'skipped';
      console.log('\n✓ Portfolio within target — skipping rebalance');
    } else {
      // ── Step 3: Quote ───────────────────────────────────────────────────
      console.log('\n→ Step 3: Getting Uniswap quote...');
      const quote = await router.getQuote({
        tokenIn: decision.tokenIn,
        tokenOut: decision.tokenOut,
        amountIn: decision.amountIn,
        walletAddress: portfolio.walletAddress,
      });
      event.quote = quote;
      console.log(`  ${decision.amountIn} wei ${decision.tokenIn} → ${quote.amountOut} ${decision.tokenOut}`);
      console.log(`  Route: ${quote.route} | Impact: ${quote.priceImpact}%`);

      // ── Step 4: Build + Execute ─────────────────────────────────────────
      console.log('\n→ Step 4: Building swap transaction...');
      const unsignedTx = await router.buildSwap({ quote, walletAddress: portfolio.walletAddress });
      console.log(`  Built — to: ${unsignedTx.to}`);

      console.log('\n→ Step 5: Submitting to KeeperHub...');
      const executionId = await executor.submit(unsignedTx);
      console.log(`  Execution ID: ${executionId}`);

      // ── Step 5: Confirm ─────────────────────────────────────────────────
      console.log('\n→ Step 6: Waiting for confirmation...');
      const result = await executor.waitForConfirmation(executionId);
      event.execution = result;
      event.status    = result.success ? 'executed' : 'failed';

      if (result.success) {
        console.log(`\n✓ Rebalance complete!`);
        console.log(`  TX Hash:  ${result.txHash}`);
        console.log(`  Gas used: ${result.gasUsed}`);
        console.log(`  Retries:  ${result.retryCount}`);
        console.log(`  Audit:    ${result.auditUrl}`);
      } else {
        console.log(`\n✗ Rebalance failed: ${result.error}`);
      }
    }
  } catch (err: any) {
    console.error(`\n✗ Cycle error: ${err.message}`);
    event.status = 'failed';
  }

  // ── Step 6: Log to 0G Storage ─────────────────────────────────────────
  console.log('\n→ Logging to 0G Storage...');
  try {
    await logMemory.append(event as RebalanceEvent);
    await kvMemory.setLastRun(Date.now());
    console.log(`  ✓ Logged — status: ${event.status}`);
  } catch (err: any) {
    console.warn(`  Storage write failed: ${err.message}`);
  }

  console.log(`\n[${runId}] Cycle complete\n`);
}

// ── Start agent ───────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║         VOLTAIRE AI AGENT            ║');
  console.log('║  Autonomous Portfolio Rebalancer     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Wallet:   ${process.env.AGENT_WALLET_ADDRESS}`);
  console.log(`Target:   ETH ${parseFloat(process.env.TARGET_ETH_RATIO||'0.6')*100}% / USDC ${parseFloat(process.env.TARGET_USDC_RATIO||'0.4')*100}%`);
  console.log(`Schedule: ${process.env.REBALANCE_CRON || '0 9 * * *'}\n`);

  // Init KeeperHub
  console.log('→ Initializing KeeperHub session...');
  await executor.initialize();
  console.log('✓ KeeperHub ready\n');

  // Start triggers
  const scheduled   = new ScheduledTrigger();
  const instruction = new InstructionTrigger();
  scheduled.start(runRebalance);
  instruction.start(runRebalance);
  (global as any).instructionTrigger = instruction;

  console.log('✓ Agent running — triggers active\n');

  if (process.env.RUN_ON_START === 'true') {
    await runRebalance();
  }
}

main().catch(console.error);