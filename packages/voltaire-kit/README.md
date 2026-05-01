# VoltaireKit

> **DeFi agent framework. Stripe for autonomous on-chain agents.**

Build a production DeFi agent in an afternoon. VoltaireKit gives you the painful infrastructure — verifiable memory, on-chain reasoning, auditable execution, multi-agent coordination — as importable primitives.

[![0G](https://img.shields.io/badge/0G-Galileo%20Testnet-purple)](https://0g.ai) [![ERC-7857](https://img.shields.io/badge/ERC--7857-Agent%20Identity-blue)](https://eips.ethereum.org/EIPS/eip-7857) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Why this exists

Building a DeFi agent today means three weeks of plumbing before you write a single line of strategy:

- Memory that survives restarts **and** is verifiable
- LLM reasoning that does not hallucinate trades into existence
- Execution that emits an on-chain audit trail
- Multiple agents coordinating without trampling each other

VoltaireKit packages all of it. You import primitives. You ship.

> *"Stripe didn't invent payments. They packaged the infrastructure into 5 lines of code. VoltaireKit does that for DeFi agents."*

---

## The two-layer architecture

```
┌────────────────────────────────────────────────┐
│  Voltaire AI                                   │  ← the product
│  Autonomous portfolio rebalancer.              │
│  First agent built on the kit.                 │
├────────────────────────────────────────────────┤
│  VoltaireKit                                   │  ← the framework
│  Brain · AgentMemory · Executor · Router       │
│  SwarmCoordinator · NFTMinter (ERC-7857)       │
├────────────────────────────────────────────────┤
│  0G — storage · compute · chain                │  ← the substrate
└────────────────────────────────────────────────┘
```

Every Voltaire AI primitive comes from the kit. Swap the kit, the agent breaks. That is the test of a real framework — and it passes.

---

## Quickstart

```ts
import {
  Brain,
  AgentMemory,
  KeeperHubExecutor,
  UniswapRouter,
  ScheduledTrigger,
} from '@voltaire/kit';

const memory   = new AgentMemory();
const brain    = new Brain();
const router   = new UniswapRouter();
const executor = new KeeperHubExecutor();

// Cron-triggered rebalance loop, ~50 LOC
new ScheduledTrigger('0 9 * * *', async () => {
  const portfolio = await memory.get('portfolio:state');
  const decision  = await brain.decide({ portfolio, target: { ETH: 0.6, USDC: 0.4 } });
  if (decision.action === 'swap') {
    const quote  = await router.getQuote(decision.params);
    const result = await executor.executeSwap(quote);
    await memory.set('last_run', { decision, result, ts: Date.now() });
  }
}).start();
```

That is a complete, production-shaped DeFi agent. Memory is persisted to SQLite **and** mirrored to 0G Storage. Every `executor` call emits a verifiable KeeperHub audit URL. The brain falls back to threshold logic if 0G Compute is unreachable.

---

## The primitives

| Primitive | What it does | Backed by |
|---|---|---|
| **Brain** | LLM reasoning with on-chain compute + threshold fallback | 0G Compute |
| **AgentMemory** | Hybrid persistence: SQLite (fast) + 0G Storage (verifiable) | SQLite + 0G Storage |
| **LogMemory** | Append-only event log mirrored to 0G | 0G Storage |
| **KeeperHubExecutor** | Verifiable swap execution with audit URLs | KeeperHub MCP |
| **UniswapRouter** | Quote + swap via Uniswap Trade API | Uniswap |
| **ScheduledTrigger** | Cron-style activation | node-cron |
| **InstructionTrigger** | HTTP-triggered activation | Express |
| **SwarmCoordinator** | Multi-agent shared state via 0G Storage | 0G Storage |
| **NFTMinter** | ERC-7857 agent identity preparation | 0G Chain |

---

## Swarm coordination — the headline feature

One agent is fine. Multiple agents on the same wallet **collide** — two of them might rebalance the same position twice, or fight over the same opportunity. SwarmCoordinator solves this with a shared whiteboard pattern:

```
Monitor agent:    "ETH dropped 4% — broadcasting"
                          ↓ writes to 0G Storage
Rebalancer agent: "I see it. Claiming this trade."  ← claim wins
DCA agent:        "Rebalancer claimed it. I'll DCA instead, no conflict."
```

Three agents. One wallet. Zero collisions. **No central server. No message broker.** State verifiable on-chain.

```ts
const swarm = new SwarmCoordinator({
  memory,
  agentId: 'agent:rebalancer:01',
  role: 'rebalancer',
  walletAddress: wallet.address,
});

await swarm.register();
const signals = await swarm.readSignals('market:eth_drop');
const claimed = await swarm.claimExecution('rebalance:eth_drop:01', 30_000);
if (claimed) { /* execute */ } else { /* another agent has it */ }
```

**Live demo:** `packages/voltaire-kit/examples/swarm-demo/index.ts` — three agents, one process, real 0G Storage txSeqs on Galileo testnet.

---

## ERC-7857 agent identity

Agents need passports. ERC-7857 is the proposed standard for **non-transferable identity NFTs** that encode an agent's role, reputation, and verifiable history.

VoltaireKit ships:
- **`NFTMinter`** (TS) — builds canonical metadata, signs it with the agent wallet, prepares the mint request
- **`AgentNFT.sol`** (Solidity) — minimal ERC-7857 contract, designed for deployment on **0G Chain**

```ts
const minter = new NFTMinter(process.env.AGENT_PRIVATE_KEY!);
const metadata = minter.buildMetadata({
  agentId: 'agent:rebalancer:01',
  role: 'rebalancer',
  capabilities: ['rebalance', 'execute', 'monitor'],
  reputationScore: 87,
  totalExecutions: 142,
  firstSeenAt: Date.now(),
});
const mintRequest = await minter.prepareMintRequest(metadata, ogStorageURI);
// → submit mintRequest.signature + metadataHash to AgentNFT.sol on 0G Chain
```

---

## The first agent built on the kit

**Voltaire AI** — autonomous ETH/USDC rebalancer running on Base Sepolia. Production-shaped, end-to-end working pipeline. Imports every primitive from `@voltaire/kit`:

```ts
// agents/rebalancer/index.ts (lines 8-22)
import {
  OGComputeBrain,
  KVMemory,
  LogMemory,
  UniswapRouter,
  TOKENS,
  KeeperHubExecutor,
  ScheduledTrigger,
  InstructionTrigger,
} from '../../packages/voltaire-kit/src';
```

The rebalancer no longer reaches into `core/`. It is a **kit consumer**. Refactor or fork the kit and the agent reflects every change.

---

## Why 0G specifically

A multi-agent shared whiteboard needs three properties:

1. **Cheap writes** — agents publish signals constantly, costs must be near-zero
2. **Fast reads** — coordination breaks down at human-perceptible latency
3. **Verifiable** — `txSeq` proof for every state change, not just "trust me"

Filecoin and Arweave are passive archival storage — too slow, too expensive for live agent state.
Postgres is fast but unverifiable.
**0G Storage is the only layer that hits all three** — that is what makes the swarm primitive practical.

For 0G, this means VoltaireKit is a flagship use case beyond static file storage: **0G as the substrate for autonomous agent coordination.**

---

## Use cases

- **Portfolio rebalancing** — Voltaire AI, included
- **DAO treasury swarms** — monitor + rebalancer + DCA agents coordinating on one treasury
- **Yield farming agents** — swap UniswapRouter for a yield aggregator, reuse everything else
- **MEV defense swarms** — one agent watches mempool, broadcasts threats, others pause
- **Cross-chain arb swarms** — agents on different chains coordinating via 0G as neutral memory

---

## Roadmap

- [ ] Additional executors: 1inch, CoW Protocol, Hyperliquid
- [ ] Additional triggers: price-condition, volatility-condition
- [ ] AgentNFT deployment on 0G Chain mainnet
- [ ] Swarm reputation gossip protocol
- [ ] Public package on npm

---

## License

MIT — see [LICENSE](../../LICENSE)

## Author

**Almond** — [@AlmondWeb3](https://x.com/AlmondWeb3)

Built for [ETHGlobal Open Agents](https://ethglobal.com).
