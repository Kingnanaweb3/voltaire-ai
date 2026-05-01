# Voltaire AI

> **Autonomous portfolio rebalancer.** First agent built on **VoltaireKit** — the DeFi agent framework.

[![0G](https://img.shields.io/badge/0G-Galileo%20Testnet-purple)](https://0g.ai) [![Base](https://img.shields.io/badge/Base-Sepolia-blue)](https://base.org) [![KeeperHub](https://img.shields.io/badge/KeeperHub-MCP-orange)](https://keeperhub.com) [![Uniswap](https://img.shields.io/badge/Uniswap-Trade%20API-pink)](https://uniswap.org)

---

## Two layers, one repo

```
┌────────────────────────────────────────────────┐
│  Voltaire AI                                   │  ← the product
│  ETH/USDC rebalancer, autonomous, verifiable   │
├────────────────────────────────────────────────┤
│  VoltaireKit                                   │  ← the framework
│  Brain · Memory · Executor · Router · Swarm    │
├────────────────────────────────────────────────┤
│  0G + Base + KeeperHub + Uniswap               │  ← substrate
└────────────────────────────────────────────────┘
```

- **Voltaire AI** — production-shaped DeFi agent. Cron-triggered, on-chain executed, audit-trailed.
- **VoltaireKit** — the framework Voltaire AI is built on. Reusable primitives any dev can ship an agent with in an afternoon. → [`packages/voltaire-kit/README.md`](./packages/voltaire-kit/README.md)

---

## What it does

Voltaire AI keeps a wallet at a target ETH/USDC ratio (default 60/40). Every cron tick:

1. Reads portfolio state from **0G Storage**-backed memory
2. **Brain** decides whether to rebalance, using 0G Compute (with threshold fallback)
3. **UniswapRouter** quotes the swap
4. **KeeperHubExecutor** signs and submits, returns a verifiable audit URL
5. Result is logged to SQLite + mirrored to 0G Storage

Every step has on-chain proof. Every memory write has a 0G `txSeq`. Every execution has a KeeperHub audit hash. Nothing is "trust me."

---

## What makes it different — the swarm

Multiple agents, one wallet, **zero collisions**. SwarmCoordinator (a kit primitive) lets agents publish signals and claim execution through a shared 0G Storage namespace. No central server. No message broker. Just verifiable shared memory.

```
monitor      → publishes "ETH dropped 4%"      → 0G Storage
rebalancer   → reads signal, claims execution  ← 0G Storage
dca agent    → reads signal, sees claim, runs DCA in parallel ← 0G Storage
```

Try it live: open the **/swarm** dashboard in the frontend, click *"Trigger Demo Cycle"*, watch three agents coordinate in real time with clickable txSeq proofs.

---

## Quick run

### Prerequisites
- Node 20+, pnpm or npm
- An EVM wallet with Base Sepolia ETH + USDC (faucets in [`docs/SETUP.md`](./docs/SETUP.md))
- API keys: KeeperHub, Uniswap (free), WalletConnect Project ID

### 1. Install
```bash
git clone https://github.com/Kingnanaweb3/voltaire-ai
cd voltaire-ai
npm install
```

### 2. Configure
```bash
cp .env.example .env
# fill in: AGENT_PRIVATE_KEY, KEEPERHUB_API_KEY, UNISWAP_API_KEY, etc.
```

### 3. Run
Two terminals:

```bash
# Terminal 1 — backend (API + agent)
npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Try the swarm demo (no wallet needed)
```bash
DOTENV_CONFIG_PATH=.env npx ts-node -r dotenv/config packages/voltaire-kit/examples/swarm-demo/index.ts
```

---

## Repo layout

```
voltaire-ai/
├── packages/voltaire-kit/        ← THE FRAMEWORK
│   ├── src/
│   │   ├── index.ts              ← barrel exports
│   │   ├── SwarmCoordinator.ts   ← multi-agent shared state
│   │   ├── NFTMinter.ts          ← ERC-7857 identity
│   │   └── contracts/AgentNFT.sol
│   └── examples/swarm-demo/      ← 3 agents, one process
├── core/                         ← framework internals (consumed by kit)
│   ├── brain/                    ← 0G Compute + fallback
│   ├── memory/                   ← SQLite + 0G Storage
│   ├── executor/                 ← KeeperHub MCP
│   ├── router/                   ← Uniswap
│   └── trigger/                  ← cron + instruction
├── agents/rebalancer/            ← VOLTAIRE AI — the product
├── api/                          ← Express API (incl. /api/swarm/*)
├── frontend/                     ← Next.js + RainbowKit dashboard
└── FEEDBACK*.md                  ← partner feedback (Uniswap, KeeperHub, 0G)
```

---

## Tech stack

| Layer | Tools |
|---|---|
| **Backend** | Node, Express, ts-node, better-sqlite3, ethers v6 |
| **Frontend** | Next.js 16, React 19, Tailwind, RainbowKit, wagmi |
| **Chain** | Base Sepolia (`84532`), 0G Galileo (`16602`) |
| **0G SDK** | `@0gfoundation/0g-ts-sdk` |
| **Execution** | KeeperHub MCP server |
| **Quotes** | Uniswap Trade API |
| **Oracle** | Chainlink ETH/USD |

---

## Hackathon submissions

This repo targets four ETHGlobal Open Agents tracks:

| Track | Submission | Proof |
|---|---|---|
| **0G — Framework** | VoltaireKit | [`packages/voltaire-kit/`](./packages/voltaire-kit/) |
| **0G — Autonomous Agents** | Voltaire AI + Swarm | [`agents/rebalancer/`](./agents/rebalancer/) + live txSeqs |
| **KeeperHub** | Verifiable execution | [`core/executor/`](./core/executor/) + [`FEEDBACK_KEEPERHUB.md`](./FEEDBACK_KEEPERHUB.md) |
| **Uniswap** | Trade API integration | [`core/router/`](./core/router/) + [`FEEDBACK.md`](./FEEDBACK.md) |

Partner feedback files in repo root cover what worked, what broke, and what to fix next.

---

## Known issues

See [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md). Short version:
- 0G Compute DNS unreachable from current dev env → threshold fallback in Brain handles it
- Uniswap Trade API has no Base Sepolia liquidity → mock fallback documented
- 0G Storage occasional "replacement fee too low" retries → eventually succeed, non-blocking

---

## License

MIT — see [LICENSE](./LICENSE)

## Author

**Almond** — [@AlmondWeb3](https://x.com/AlmondWeb3)

Final-year accountancy student at Ekiti State University. Building autonomous agent infrastructure between exams.

Built for [ETHGlobal Open Agents](https://ethglobal.com), May 2026.
