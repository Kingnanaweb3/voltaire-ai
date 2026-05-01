# Uniswap Trade API Feedback

Honest builder feedback from shipping Voltaire AI on the Uniswap Trade API.

**Project:** Voltaire AI — autonomous portfolio rebalancing agent
**Builder:** AlmondWeb3 ([@AlmondWeb3](https://x.com/AlmondWeb3))
**Hackathon:** ETHGlobal Open Agents
**Build window:** April 24 – May 3, 2026

## TL;DR

Trade API itself is solid. Auth, request shape, and CLASSIC routing all work. Three real pain points slowed us down:

1. Base Sepolia is listed as supported but actually has no liquidity, every quote returns 404
2. No backend SDK, everything is browser/wallet first, agents have to hand roll axios
3. ERC20 swap txs return `value: 0` which broke our KeeperHub integration silently

We shipped despite these but each one cost us hours.

## The big one: Base Sepolia is "supported" but has no pools

Your docs say:

> "All listed testnets are accessible via the API."

Base Sepolia (chainId 84532) is on that list. We pointed Trade API at it for every cycle. Every single quote came back with:

```
404 ResourceNotFound
{"errorCode":"ResourceNotFound","detail":"No quotes available","requestId":"cphUsisciYcEMpg="}
```

We checked everything. Right USDC address (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`). Right ETH address per your own docs (`0x0000...0000`). Right `chainId`. API key works (no 401). Headers correct (`x-api-key`, `Content-Type`, `Accept`).

It is not a request format bug. There is just no testnet pool with real liquidity to route the swap.

This blocked our whole product for hours. We trusted the docs, assumed our setup was wrong, kept tweaking the request. Eventually we realized the API itself was working fine, it just had nothing to quote.

**Suggestion:** add a `liquidity` flag in the supported chains table. Like "API accessible" vs "has live pools". Even a footnote, *testnet quotes may return 404 due to limited liquidity*, would have saved us an entire afternoon. Or expose `GET /supported_pairs?chainId=...` so we can know upfront what is actually swappable on each chain.

## ERC20 swap value=0 broke our KeeperHub integration

When we got Trade API working briefly on a different chain, every ETH to USDC swap came back with `value: 0` in the swap response. This is technically correct because the swap goes through WETH and the value is encoded in calldata, not the native ETH field.

But our KeeperHub `execute_transfer` integration sent `amount: 0.0 ETH` and the tx silently completed with no actual swap happening. We spent hours debugging why funds were not moving before figuring out we needed `execute_contract_call` with raw calldata, not `execute_transfer`.

**Suggestion:** call this out in the docs. Either:
- Add a one liner: *Note: ERC20 swaps return `value: 0` because the native ETH transfer happens inside the calldata. Use the `data` field directly with a contract call executor.*
- Or surface a `nativeValue` field that shows the actual ETH being swapped even when it is encoded inside calldata

## No backend SDK for agents

Voltaire is a server side agent. No browser. No MetaMask popup. We just want to call quote and swap from Node.

The current SDKs assume you have a wallet connector and a frontend. We had to use raw axios POSTs to the REST API. That worked but felt like the wrong path.

What we wish existed: a Node SDK like Stripe has. Initialize once with an API key, call `client.quote({...})`, get back a typed response. No browser assumptions.

This matters more now because more agent builders will integrate Trade API. None of them have a frontend. A backend SDK would be a big DX upgrade.

## Smaller friction points

- **No Base Sepolia token list.** Had to find WETH and USDC addresses from third party sources. A simple JSON file per chain would help.
- **`swapper` field requirement.** Buried in the docs. Missing it gives an unclear error. Would help to flag it in the quickstart.
- **`tokenInChainId` and `tokenOutChainId`.** Two separate fields confused us at first. We assumed one `chainId` would work. The dual field setup makes sense for cross chain bridges but should be called out for same chain swaps too.
- **Quote expiry.** Stale quotes cause silent failures. Would help to surface `expiresAt` more prominently or auto refresh on submit.
- **Generic 404s.** "No quotes available" could mean five things, missing liquidity, wrong token addresses, unsupported chain, amount too low. A more specific error would save debugging time.
- **No sandbox mode.** Every test consumes real API quota. A dry run mode would let us iterate fast on agent logic.

## Bugs hit

| Date | Endpoint | Error | Workaround |
|------|----------|-------|------------|
| Apr 26 | `/quote` | `swapper` field missing → unclear error | Added `swapper: walletAddress` to all requests |
| Apr 27 | swap tx | `value: 0` on ETH→USDC broke `execute_transfer` | Switched to `execute_contract_call` with raw calldata |
| Apr 27 | `/quote` | No Base Sepolia token list | Found WETH + USDC from external sources |
| Apr 30 | `/quote` | 404 every time on Base Sepolia | Built deterministic mock quote fallback |

## What worked great

- Auth is dead simple. One header, one key. Works.
- CLASSIC routing on mainnet was reliable. We tested it briefly and it worked first try.
- Quote response shape is clean and easy to map to TypeScript interfaces.
- `requestId` in error responses helps when filing tickets.
- Permit2 docs are thorough.
- Workshop video was clear and to the point.

## What we wish existed

1. **Backend agent SDK.** Stripe style. No browser deps. This is the single biggest DX upgrade you could ship.
2. **Sandbox mode.** Returns realistic quotes without on chain interaction.
3. **Per chain liquidity status.** JSON file in a public repo. So we know what is actually swappable.
4. **Swap status webhooks.** We currently poll `/swaps`. A webhook would let us close the loop without polling.
5. **Chain ID validation in error responses.** If we send a `tokenInChainId` that has no liquidity, the error should say so directly.

## What we shipped

Despite the friction, Voltaire integrates Trade API at every cycle:

- `/quote` for routing
- `/swap` for transaction building
- Real headers, real auth, real retry logic with exponential backoff

When Trade API has liquidity (mainnet), the integration is real. On Sepolia we fall back to a deterministic mock quote and reroute the KeeperHub call to a self transfer so the cycle still completes with a real on chain tx. Every cycle is logged with whether it used a real or mock quote.

The architecture is mainnet ready. Flip `CHAIN_ID` to 8453, fund the agent wallet with real ETH, and every call goes through Trade API for real.

## Repo

[github.com/Kingnanaweb3/voltaire-ai](https://github.com/Kingnanaweb3/voltaire-ai)

The Uniswap integration lives in `core/router/index.ts`. The fallback logic and code comments explain the Sepolia situation in detail.

## Contact

X: [@AlmondWeb3](https://x.com/AlmondWeb3)
