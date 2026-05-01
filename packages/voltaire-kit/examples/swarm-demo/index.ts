/**
 * Swarm Demo — three agents, one shared brain.
 *
 * Demonstrates VoltaireKit's framework primitives:
 *   - Monitor agent watches market, publishes signals
 *   - Rebalancer agent reads signals, claims execution, acts
 *   - DCA agent reads signals, runs in parallel without conflict
 *
 * All shared state flows through 0G Storage via SwarmCoordinator.
 * No central server. No message broker. Just verifiable shared memory.
 */

import { ethers } from 'ethers';
import { KVMemory, SwarmCoordinator } from '../../src';

// ---- Setup ------------------------------------------------------------------

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
);

const memory = new KVMemory();

function makeAgent(agentId: string, role: string) {
  // Demo wallets — replace with real keys for real swarm
  const wallet = ethers.Wallet.createRandom();
  return new SwarmCoordinator({
    memory,
    agentId,
    role,
    walletAddress: wallet.address,
  });
}

// ---- Three agents -----------------------------------------------------------

const monitor = makeAgent('agent:monitor:01', 'monitor');
const rebalancer = makeAgent('agent:rebalancer:01', 'rebalancer');
const dca = makeAgent('agent:dca:01', 'dca');

// ---- Agent loops ------------------------------------------------------------

async function monitorLoop() {
  console.log('[monitor] online — watching market');
  // Simulated market signal — in production this would tail price feeds
  const fakePriceDrop = { asset: 'ETH', delta: -0.04, price: 2400 };
  const sig = await monitor.publishSignal('market:eth_drop', fakePriceDrop);
  console.log('[monitor] published signal', sig.id, sig.payload);
}

async function rebalancerLoop() {
  console.log('[rebalancer] online — listening for market signals');
  const signals = await rebalancer.readSignals('market:eth_drop');
  if (signals.length === 0) {
    console.log('[rebalancer] no signals yet');
    return;
  }
  const latest = signals[signals.length - 1];
  console.log('[rebalancer] saw signal from', latest.agentId, latest.payload);

  // Claim exclusive execution so DCA agent does not double-act
  const claimed = await rebalancer.claimExecution('rebalance:eth_drop:01', 30_000);
  if (!claimed) {
    console.log('[rebalancer] another agent claimed first — standing down');
    return;
  }
  console.log('[rebalancer] claimed execution → would now call KeeperHubExecutor');
}

async function dcaLoop() {
  console.log('[dca] online — listening for market signals');
  const signals = await dca.readSignals('market:eth_drop');
  if (signals.length === 0) return;

  const claimed = await dca.claimExecution('rebalance:eth_drop:01', 30_000);
  if (!claimed) {
    console.log('[dca] rebalancer already claimed — running DCA in parallel instead');
    // DCA does its own non-conflicting action
    await dca.publishSignal('exec:dca_tick', { amount: 50, asset: 'ETH' });
    console.log('[dca] published own dca_tick signal');
  }
}

// ---- Run --------------------------------------------------------------------

async function main() {
  console.log('=== VoltaireKit Swarm Demo ===\n');

  await monitor.register();
  await rebalancer.register();
  await dca.register();
  console.log('three agents registered in swarm\n');

  await monitorLoop();
  console.log('');
  await rebalancerLoop();
  console.log('');
  await dcaLoop();

  console.log('\n=== shared state via 0G Storage — verifiable, no broker ===');
}

main().catch(err => {
  console.error('swarm demo failed:', err);
  process.exit(1);
});
