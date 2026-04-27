// ─── Voltaire AI — DCA Agent Example ────────────────────────────────────────
// Dollar Cost Averaging agent built on voltaire/core
// Buys a fixed USD amount of ETH every day at 09:00 UTC
//
// Usage:
//   cp .env.example .env  # fill in your keys
//   npx ts-node examples/dca-agent/index.ts

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { ethers } from 'ethers';
import { UniswapRouter, TOKENS } from '../../core/router';
import { KeeperHubExecutor } from '../../core/executor';
import { KVMemory, LogMemory } from '../../core/memory';
import { ScheduledTrigger, InstructionTrigger } from '../../core/trigger';
import { v4 as uuidv4 } from 'uuid';

// ── Config ────────────────────────────────────────────────────────────────────
const DCA_USD_AMOUNT  = parseFloat(process.env.DCA_USD_AMOUNT  || '10');   // $ to spend per run
const DCA_CRON        = process.env.DCA_CRON                  || '0 9 * * *'; // daily 09:00 UTC
const WALLET_ADDRESS  = process.env.AGENT_WALLET_ADDRESS!;
const ETH_PRICE_FEED  = '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1'; // Chainlink ETH/USD Base Sepolia

const router   = new UniswapRouter();
const executor = new KeeperHubExecutor();
const kvMemory = new KVMemory();
const logMemory = new LogMemory();

// ── Get live ETH price from Chainlink ────────────────────────────────────────
async function getEthPrice(): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const feed = new ethers.Contract(
      ETH_PRICE_FEED,
      ['function latestAnswer() view returns (int256)'],
      provider
    );
    const price = await feed.latestAnswer();
    return parseFloat(ethers.formatUnits(price, 8));
  } catch {
    console.warn('  [price] Chainlink feed failed — using $2000 fallback');
    return 2000;
  }
}

// ── Main DCA cycle ────────────────────────────────────────────────────────────
async function runDCA(): Promise<void> {
  const runId = uuidv4().slice(0, 8);

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  VOLTAIRE DCA — Cycle [${runId}]       ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(`  ${new Date().toISOString()}\n`);

  try {
    // ── Step 1: Get ETH price ───────────────────────────────────────────────
    console.log('→ Step 1: Getting ETH price...');
    const ethPrice = await getEthPrice();
    console.log(`  ETH price: $${ethPrice.toFixed(2)} (Chainlink)`);

    // ── Step 2: Calculate buy amount ────────────────────────────────────────
    const ethToBuy = DCA_USD_AMOUNT / ethPrice;
    const amountInWei = BigInt(Math.floor(ethToBuy * 1e18)).toString();
    console.log(`\n→ Step 2: Calculating buy amount...`);
    console.log(`  Spending: $${DCA_USD_AMOUNT} USDC → ${ethToBuy.toFixed(6)} ETH`);

    // ── Step 3: Get Uniswap quote ───────────────────────────────────────────
    console.log(`\n→ Step 3: Getting Uniswap quote...`);
    const quote = await router.getQuote({
      tokenIn:  'USDC',
      tokenOut: 'ETH',
      amountIn: String(DCA_USD_AMOUNT * 1e6), // USDC has 6 decimals
      walletAddress: WALLET_ADDRESS,
    });
    console.log(`  ${DCA_USD_AMOUNT} USDC → ${ethers.formatEther(quote.amountOut)} ETH`);
    console.log(`  Route: ${quote.route} | Impact: ${quote.priceImpact}%`);

    // ── Step 4: Build swap transaction ──────────────────────────────────────
    console.log(`\n→ Step 4: Building swap transaction...`);
    const unsignedTx = await router.buildSwap({ quote, walletAddress: WALLET_ADDRESS });
    console.log(`  Built — to: ${unsignedTx.to}`);

    // ── Step 5: Submit to KeeperHub ─────────────────────────────────────────
    console.log(`\n→ Step 5: Submitting to KeeperHub...`);
    const executionId = await executor.submit(unsignedTx);
    console.log(`  Execution ID: ${executionId}`);

    // ── Step 6: Wait for confirmation ───────────────────────────────────────
    console.log(`\n→ Step 6: Waiting for confirmation...`);
    const result = await executor.waitForConfirmation(executionId);

    if (result.success) {
      console.log(`\n✓ DCA complete!`);
      console.log(`  Bought:  ~${ethToBuy.toFixed(6)} ETH`);
      console.log(`  Spent:   $${DCA_USD_AMOUNT} USDC`);
      console.log(`  TX Hash: ${result.txHash}`);
      console.log(`  Audit:   ${result.auditUrl}`);
    } else {
      console.log(`\n✗ DCA failed: ${result.error}`);
    }

    // ── Step 7: Log to 0G Storage ───────────────────────────────────────────
    console.log(`\n→ Step 7: Logging to 0G Storage...`);
    await logMemory.append({
      id: runId,
      timestamp: Date.now(),
      type: 'dca',
      ethPrice,
      usdAmount: DCA_USD_AMOUNT,
      ethBought: ethToBuy,
      status: result.success ? 'executed' : 'failed',
      txHash: result.txHash,
      executionId,
    } as any);
    await kvMemory.setLastRun(Date.now());
    console.log(`  ✓ Logged`);

  } catch (err: any) {
    console.error(`\n✗ DCA cycle error: ${err.message}`);
  }

  console.log(`\n[${runId}] Cycle complete\n`);
}

// ── Start agent ───────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║      VOLTAIRE DCA AGENT              ║');
  console.log('║  Dollar Cost Averaging — ETH/USDC    ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Wallet:   ${WALLET_ADDRESS}`);
  console.log(`Amount:   $${DCA_USD_AMOUNT} USDC per run`);
  console.log(`Schedule: ${DCA_CRON}\n`);

  // Init KeeperHub
  console.log('→ Initializing KeeperHub session...');
  await executor.initialize();
  console.log('✓ KeeperHub ready\n');

  // Start triggers
  const scheduled   = new ScheduledTrigger();
  const instruction = new InstructionTrigger();
  scheduled.start(runDCA);
  instruction.start(runDCA);

  console.log('✓ DCA Agent running — triggers active\n');

  if (process.env.RUN_ON_START === 'true') {
    await runDCA();
  }
}

main().catch(console.error);
