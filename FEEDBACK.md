# Uniswap API — Builder Feedback

**Project:** Voltaire AI — Autonomous Portfolio Rebalancing Agent
**Builder:** AlmondWeb3 | @AlmondWeb3 on X
**Hackathon:** 0G Labs x Uniswap x KeeperHub Hackathon
**Date range:** April 24 – May 3, 2026

---

## What worked well

- The `/quote` endpoint worked on first try with a clean response — tokenIn, tokenOut, amountIn, routing, priceImpact all returned correctly
- `CLASSIC` routing on Base Sepolia was reliable and fast across all test calls
- The `x-api-key` header auth is simple and predictable
- Price impact percentage was useful for building slippage protection logic
- Quote responses are well-structured and easy to map to TypeScript interfaces
- Base Sepolia testnet had good liquidity for ETH/USDC — quotes returned consistently without failures

---

## Friction points encountered

- **No clear Base Sepolia token address list in docs** — had to find WETH (`0x4200000000000000000000000000000000000006`) and USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) addresses from third-party sources. A verified token address reference page per testnet would save significant time.

- **`swapper` field requirement not obvious** — the `/quote` endpoint requires a `swapper` address but this is buried in the docs. Missing it causes a silent failure or confusing error rather than a clear validation message.

- **No sandbox/mock mode** — every test call consumes a real API quota. During development, hitting the endpoint 50+ times to debug integration issues burns through rate limits fast. A mock mode or local stub would be valuable.

- **`tokenInChainId` and `tokenOutChainId` vs `chainId`** — the API uses separate chain ID fields for input and output tokens rather than a single `chainId`. This is not immediately intuitive and caused initial confusion when porting from other swap APIs.

- **Swap transaction `value` field is `0` for ERC20 swaps** — when building a Uniswap swap transaction for ETH→USDC, the unsigned transaction returned has `value: 0` because the swap goes through WETH wrapping internally. This broke our KeeperHub `execute_transfer` integration which expected a non-zero ETH value. The docs don't warn about this behavior explicitly.

- **Quote expiry not surfaced clearly** — quotes expire but the expiry timestamp (`expiresAt`) is not prominently documented. In an autonomous agent that takes time between quote and execution, a stale quote causes a silent failure downstream.

- **No webhook or streaming quote** — for an autonomous agent running on a schedule, polling for a fresh quote on every cycle works but feels inefficient. A quote subscription or price feed endpoint would be useful for agents that need to act on price movements in real time.

---

## Bugs hit

| Date | Endpoint | Error | Workaround used |
|------|----------|-------|-----------------|
| Apr 26 | `/quote` | `swapper` field missing caused unclear error | Added `swapper: walletAddress` to all quote requests |
| Apr 27 | Swap tx execution | `value: 0` on ETH→USDC swap broke `execute_transfer` on KeeperHub | Switched to `execute_contract_call` with raw calldata |
| Apr 27 | `/quote` | No Base Sepolia token addresses in docs | Found WETH + USDC addresses from external sources |

---

## Documentation gaps

- No testnet token address reference (WETH, USDC, WBTC per chain)
- `swapper` field not highlighted as required in the quick start
- No explanation of why `value` is 0 on ERC20 swaps and what to do with the calldata
- No rate limit documentation — unclear how many calls per minute/day are allowed on free tier
- No TypeScript SDK — had to hand-write all types and fetch wrappers

---

## Missing endpoints or features I needed

- **`GET /tokens?chainId=84532`** — verified token list per chain with addresses, decimals, and logos
- **`GET /quote/stream`** — streaming quote updates for real-time agent decision making
- **`POST /swap/simulate`** — dry-run a swap without submitting to chain, useful for agent testing
- **TypeScript SDK** — a typed client would eliminate a lot of boilerplate for agent builders

---

## DX improvements I would suggest

- Add a "Builder quickstart for agents" guide — most Uniswap docs assume a frontend wallet context, not a server-side autonomous agent. The auth flow, quote→swap→execute pipeline, and gas handling are all different in an agent context.
- Publish verified testnet token addresses in the docs
- Add clearer error messages when required fields are missing from `/quote`
- Document the `value: 0` behavior on ERC20 swaps explicitly — this tripped us up integrating with a third-party execution layer
- Consider an official TypeScript/Node.js SDK for backend agent builders
