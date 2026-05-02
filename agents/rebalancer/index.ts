// ─── Voltaire AI — Rebalancer Agent ─────────────────────────────────────────
// Sequential agent loop — all four integrations wired.
// LangGraph can be added later once version is confirmed.

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { ethers } from 'ethers';
// Voltaire AI — first agent built on VoltaireKit framework.
// All primitives below come from the kit, not the core/ directory.
import {
  OGComputeBrain,
  KVMemory,
  LogMemory,
  UniswapRouter,
  TOKENS,
  KeeperHubExecutor,
  ScheduledTrigger,
  InstructionTrigger,
  PortfolioState,
  SwapDecision,
  RebalanceEvent,
} from '../../packages/voltaire-kit/src';
import { v4 as uuidv4 } from 'uuid';

const brain     = new OGComputeBrain();
const kvMemory  = new KVMemory();
const logMemory = new LogMemory();
const router    = new UniswapRouter();
const executor  = new KeeperHubExecutor();

// ── Step 1: Fetch balances ────────────────────────────────────────────────────
async function fetchPortfolio(savedConfig?: any): Promise<PortfolioState> {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
  const walletAddress = process.env.AGENT_WALLET_ADDRESS!;
  const targetRatios = savedConfig?.targetRatios ?? {
    ETH:  parseFloat(process.env.TARGET_ETH_RATIO  || "0.60"),
    USDC: parseFloat(process.env.TARGET_USDC_RATIO || "0.40"),
  };

  const ethBalance = await provider.getBalance(walletAddress);
  const ethAmount  = parseFloat(ethers.formatEther(ethBalance));

  const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
  const usdcContract = new ethers.Contract(TOKENS.USDC, usdcAbi, provider);
  let usdcAmount = 0;
  try {
    const raw  = await usdcContract.balanceOf(walletAddress);
    usdcAmount = parseFloat(ethers.formatUnits(raw, 6));
  } catch (e: any) { console.warn('  [step1] USDC read failed:', e?.message?.slice(0,200) || String(e)); }

  // Live ETH price from Chainlink on Base Sepolia
  let ethPrice = 3000;
  try {
    const feed = new ethers.Contract(
      '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', // Chainlink ETH/USD Base Sepolia
      ['function latestAnswer() view returns (int256)'],
      provider
    );
    const price = await feed.latestAnswer();
    ethPrice = parseFloat(ethers.formatUnits(price, 8));
    console.log(`  [step1] ETH price: $${ethPrice.toFixed(2)} (Chainlink)`);
  } catch {
    console.warn('  [step1] Price feed failed — using $3000 fallback');
  }
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
async function makeDecision(portfolio: PortfolioState, savedConfig?: any): Promise<SwapDecision> {
  try {
    return await brain.decide(portfolio);
  } catch {
    console.warn('  [step2] Brain unavailable — threshold fallback');
    const threshold = savedConfig?.driftThreshold ?? parseFloat(process.env.DRIFT_THRESHOLD || "0.05");
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
  // ── Load config from KV memory ──────────────────────────────────────────
  const savedConfig = await kvMemory.getConfig();

  // ── Emergency pause check ────────────────────────────────────────────────
  if (savedConfig?.paused) {
    console.log("\n⏸ Agent is PAUSED — skipping cycle. Unpause via /api/config");
    return;
  }

  // ── Cooldown check ───────────────────────────────────────────────────────
  const cooldownHours = savedConfig?.cooldownHours ?? 0;
  if (cooldownHours > 0) {
    const lastRun = await kvMemory.getLastRun();
    if (lastRun) {
      const hoursSince = (Date.now() - lastRun) / 3600000;
      if (hoursSince < cooldownHours) {
        console.log(`\n⏳ Cooldown active — ${(cooldownHours - hoursSince).toFixed(1)}h remaining. Skipping.`);
        return;
      }
    }
  }

  const runId = uuidv4().slice(0, 8);
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  VOLTAIRE — Rebalance Cycle [${runId}]  ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`  ${new Date().toISOString()}\n`);

  const event: Partial<RebalanceEvent> = { id: runId, timestamp: Date.now() };

  try {
    // ── Step 1: Fetch ─────────────────────────────────────────────────────
    console.log('→ Step 1: Fetching portfolio state...');
    const portfolio = await fetchPortfolio(savedConfig);
    event.portfolioState = portfolio;
    console.log(`  ETH ${(portfolio.currentRatios.ETH * 100).toFixed(1)}% | USDC ${(portfolio.currentRatios.USDC * 100).toFixed(1)}% | Drift ${(portfolio.maxDrift * 100).toFixed(2)}% | $${portfolio.totalUsdValue.toFixed(2)}`);

    // ── Stop-loss check ──────────────────────────────────────────────────
    const stopLossPrice = savedConfig?.stopLossPrice ?? parseFloat(process.env.STOP_LOSS_ETH_PRICE || "0");
    const currentEthPrice = portfolio.balances.find(b => b.symbol === 'ETH')
      ? portfolio.totalUsdValue / parseFloat(require('ethers').ethers.formatEther(portfolio.balances.find(b => b.symbol === 'ETH')!.amount))
      : 0;
    if (stopLossPrice > 0 && currentEthPrice > 0 && currentEthPrice < stopLossPrice) {
      console.log(`\n⚠ STOP-LOSS TRIGGERED — ETH price $${currentEthPrice.toFixed(2)} below floor $${stopLossPrice}`);
      console.log(`  Converting all ETH → USDC to protect portfolio`);
      event.status = 'stop-loss';
      const ethBalance = portfolio.balances.find(b => b.symbol === 'ETH');
      if (ethBalance && ethBalance.amount !== '0') {
        const quote = await router.getQuote({
          tokenIn: 'ETH', tokenOut: 'USDC',
          amountIn: ethBalance.amount,
          walletAddress: portfolio.walletAddress,
        });
        const unsignedTx = await router.buildSwap({ quote, walletAddress: portfolio.walletAddress });
        const executionId = await executor.submit(unsignedTx);
        const result = await executor.waitForConfirmation(executionId);
        event.execution = result;
        event.status = result.success ? 'stop-loss-executed' : 'stop-loss-failed';
        console.log(result.success ? `\n✓ Stop-loss executed — portfolio protected` : `\n✗ Stop-loss failed: ${result.error}`);
      }
      await logMemory.append(event as any);
      await kvMemory.setLastRun(Date.now());
      return;
    }

    // ── Step 2: Decide ────────────────────────────────────────────────────
    console.log('\n→ Step 2: Asking brain for decision...');
    const decision = await makeDecision(portfolio, savedConfig);
    event.decision = decision;
    console.log(`  Decision: ${decision.shouldSwap ? `SWAP ${decision.tokenIn} → ${decision.tokenOut}` : 'NO ACTION'}`);
    console.log(`  Reasoning: ${decision.reasoning}`);

    if (!decision.shouldSwap) {
      event.status = 'skipped';
      console.log('\n✓ Portfolio within target — skipping rebalance');
    } else {
      // ── Gas price check ──────────────────────────────────────────────────
      const maxGasGwei = savedConfig?.maxGasGwei ?? 0;
      if (maxGasGwei > 0) {
        try {
          const feeData = await new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC).getFeeData();
          const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'));
          console.log(`  [gas] Current: ${gasPriceGwei.toFixed(2)} gwei | Max: ${maxGasGwei} gwei`);
          if (gasPriceGwei > maxGasGwei) {
            console.log(`\n⛽ Gas price too high — skipping rebalance`);
            event.status = 'skipped';
            await logMemory.append(event as RebalanceEvent);
            return;
          }
        } catch { console.warn('  [gas] Gas check failed — proceeding anyway'); }
      }

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
  const scheduled = new ScheduledTrigger();
  scheduled.start(runRebalance);

  // Poll SQLite for manual trigger flag from API
  const pollDb = require('../../db').default;
  setInterval(async () => {
    try {
      const row = pollDb.prepare("SELECT value FROM state WHERE key = 'trigger:manual'").get() as any;
      if (row) {
        pollDb.prepare("DELETE FROM state WHERE key = 'trigger:manual'").run();
        console.log('[InstructionTrigger] Manual trigger received — firing cycle');
        await runRebalance();
      }
    } catch {}
  }, 1000);
  console.log('[InstructionTrigger] Ready — POST /api/trigger to fire');

  console.log('✓ Agent running — triggers active\n');

  if (process.env.RUN_ON_START === 'true') {
    await runRebalance();
  }
}

main().catch(console.error);