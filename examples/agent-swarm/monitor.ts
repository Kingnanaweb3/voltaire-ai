// ─── Voltaire AI — Monitor Agent (Swarm Node 1) ─────────────────────────────
// Watches portfolio drift every 5 minutes.
// When drift exceeds threshold, posts a rebalance signal to 0G Storage KV.
// The Executor Agent picks up the signal and acts.
//
// Communication pattern: Monitor → 0G Storage KV → Executor
//
// Usage:
//   npx ts-node examples/agent-swarm/monitor.ts

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { ethers } from 'ethers';
import { KVMemory } from '../../core/memory';
import { UniswapRouter, TOKENS } from '../../core/router';
import { v4 as uuidv4 } from 'uuid';

const kvMemory = new KVMemory();
const router   = new UniswapRouter();

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DRIFT_THRESHOLD  = parseFloat(process.env.DRIFT_THRESHOLD || '0.05');
const WALLET_ADDRESS   = process.env.AGENT_WALLET_ADDRESS!;
const ETH_PRICE_FEED   = '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1';
const TARGET_ETH       = parseFloat(process.env.TARGET_ETH_RATIO  || '0.60');
const TARGET_USDC      = parseFloat(process.env.TARGET_USDC_RATIO || '0.40');

// ── Get live ETH price ────────────────────────────────────────────────────────
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
    return 2000;
  }
}

// ── Check portfolio drift ─────────────────────────────────────────────────────
async function checkDrift(): Promise<void> {
  const checkId = uuidv4().slice(0, 8);
  console.log(`\n[Monitor] Drift check [${checkId}] — ${new Date().toISOString()}`);

  try {
    const provider     = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const ethBalance   = await provider.getBalance(WALLET_ADDRESS);
    const ethAmount    = parseFloat(ethers.formatEther(ethBalance));
    const ethPrice     = await getEthPrice();
    const ethUsdValue  = ethAmount * ethPrice;

    // Read USDC balance
    const usdcAbi      = ['function balanceOf(address) view returns (uint256)'];
    const usdcContract = new ethers.Contract(TOKENS.USDC, usdcAbi, provider);
    let usdcAmount     = 0;
    try {
      const raw  = await usdcContract.balanceOf(WALLET_ADDRESS);
      usdcAmount = parseFloat(ethers.formatUnits(raw, 6));
    } catch {}

    const total        = ethUsdValue + usdcAmount;
    const currentEth   = total > 0 ? ethUsdValue / total : 0;
    const currentUsdc  = total > 0 ? usdcAmount / total : 0;
    const drift        = Math.max(
      Math.abs(currentEth - TARGET_ETH),
      Math.abs(currentUsdc - TARGET_USDC)
    );

    console.log(`[Monitor] ETH: ${(currentEth * 100).toFixed(1)}% | USDC: ${(currentUsdc * 100).toFixed(1)}% | Drift: ${(drift * 100).toFixed(2)}% | $${total.toFixed(2)}`);

    // ── Check if executor is already working ─────────────────────────────────
    const existingSignal = await kvMemory.get('rebalance_signal');
    if (existingSignal?.status === 'pending') {
      console.log(`[Monitor] Signal already pending — executor is on it. Skipping.`);
      return;
    }

    if (drift > DRIFT_THRESHOLD) {
      // ── Post signal to 0G Storage for Executor Agent ─────────────────────
      const signal = {
        id:         checkId,
        timestamp:  Date.now(),
        status:     'pending',
        drift:      drift,
        currentEth, currentUsdc,
        ethPrice,
        totalUsd:   total,
        tokenIn:    currentEth > TARGET_ETH ? 'ETH' : 'USDC',
        tokenOut:   currentEth > TARGET_ETH ? 'USDC' : 'ETH',
        postedBy:   'monitor-agent',
      };

      await kvMemory.set('rebalance_signal', signal);
      console.log(`[Monitor] ⚡ Drift ${(drift * 100).toFixed(2)}% exceeds threshold — signal posted to 0G Storage`);
      console.log(`[Monitor] Signal ID: ${checkId} | Action: SWAP ${signal.tokenIn} → ${signal.tokenOut}`);
    } else {
      console.log(`[Monitor] ✓ Portfolio within target — no action needed`);
    }

  } catch (err: any) {
    console.error(`[Monitor] Check failed: ${err.message}`);
  }
}

// ── Start monitor ─────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║    VOLTAIRE — MONITOR AGENT          ║');
  console.log('║    Swarm Node 1 of 2                 ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Wallet:    ${WALLET_ADDRESS}`);
  console.log(`Threshold: ${DRIFT_THRESHOLD * 100}%`);
  console.log(`Poll:      every 5 minutes`);
  console.log(`Channel:   0G Storage KV → rebalance_signal\n`);

  // Run immediately then on interval
  await checkDrift();
  setInterval(checkDrift, POLL_INTERVAL_MS);
}

main().catch(console.error);
