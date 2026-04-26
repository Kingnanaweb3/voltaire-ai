# Voltaire AI

**Autonomous Portfolio Rebalancing Agent** — powered by 0G · Uniswap · KeeperHub

> Voltaire AI monitors your on-chain portfolio daily, calculates drift from your target ratio, and automatically executes the minimum swaps needed to rebalance — powered by 0G, settled via Uniswap, guaranteed by KeeperHub.

---

## Demo

🎥 [Demo video](#) · 🌐 [Live demo](#) · 📐 [Architecture diagram](./docs/architecture.png)

---

## Quick start

```bash
git clone https://github.com/Kingnanaweb3/voltaire-ai
cd voltaire-ai
cp .env.example .env    # Add your API keys
npm install
npm run agent           # Start the rebalancer agent
npm run dev             # Start agent + API server
```

---

## What it does

1. **Monitors** your Base Sepolia wallet portfolio daily at 09:00 UTC
2. **Calculates** drift from your target ETH/USDC ratio
3. **Decides** whether to rebalance using 0G Compute (LLM inference)
4. **Executes** the minimum swap via Uniswap API
5. **Guarantees** delivery via KeeperHub (retry, gas optimization, MEV protection)
6. **Logs** every decision to 0G Storage for full audit trail

---

## SDK — build your own agent

```typescript
import { UniswapRouter, KeeperHubExecutor, ScheduledTrigger } from './sdk';

const router = new UniswapRouter();
const executor = new KeeperHubExecutor();

async function myAgent() {
  const quote = await router.getQuote({ tokenIn: 'ETH', tokenOut: 'USDC', amountIn: '1e18', walletAddress });
  const tx = await router.buildSwap({ quote, walletAddress });
  const jobId = await executor.submit(tx);
  const result = await executor.waitForConfirmation(jobId);
  console.log(result.txHash);
}

const trigger = new ScheduledTrigger('0 9 * * *');
trigger.start(myAgent);
```

See [examples/simple-swap](./examples/simple-swap) for a complete working example.

---

## Integrations

**0G Labs** — Brain module uses 0G Compute for sealed LLM inference. Memory module uses 0G Storage KV (state) and Log (history). Agent logic deployable on 0G infrastructure.

**Uniswap** — Router module wraps Uniswap Trade API v1. Handles quote, swap build, and status polling on Base Sepolia. See [FEEDBACK.md](./FEEDBACK.md) for full builder experience notes.

**KeeperHub** — Executor module integrates KeeperHub MCP server for guaranteed transaction delivery with retry logic, gas optimization, and MEV protection.

---

## Architecture

```
voltaire/
├── core/           # Framework primitives
│   ├── brain/      # 0G Compute LLM decision engine
│   ├── memory/     # 0G Storage KV + Log
│   ├── trigger/    # Scheduler, condition, instruction
│   ├── executor/   # KeeperHub MCP integration
│   └── router/     # Uniswap API wrapper
├── agents/
│   └── rebalancer/ # Demo agent — built using core/
├── sdk/            # Public SDK for external developers
├── examples/       # Example agents
└── api/            # REST API for frontend
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `UNISWAP_API_KEY` | Uniswap Developer Platform API key |
| `KEEPERHUB_API_KEY` | KeeperHub API key |
| `OG_RPC_URL` | 0G testnet RPC |
| `OG_STORAGE_URL` | 0G Storage API |
| `OG_COMPUTE_URL` | 0G Compute API |
| `AGENT_PRIVATE_KEY` | Agent wallet private key |
| `BASE_SEPOLIA_RPC` | Base Sepolia RPC URL |

---

## Team

**AlmondWeb3**  
X: [@AlmondWeb3](https://x.com/AlmondWeb3)  
Telegram: @AlmondWeb3  

---

## License

MIT
