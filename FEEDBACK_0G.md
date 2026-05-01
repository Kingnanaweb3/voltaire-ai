# 0G Labs Builder Feedback

Honest builder feedback from shipping Voltaire AI on 0G Storage and 0G Compute.

**Project:** Voltaire AI — autonomous portfolio rebalancing agent
**Builder:** AlmondWeb3 ([@AlmondWeb3](https://x.com/AlmondWeb3))
**Hackathon:** ETHGlobal Open Agents
**Build window:** April 24 – May 3, 2026

## TL;DR

0G Storage works great. Real uploads, real tx hashes, audit trail rock solid. 0G Compute was completely unreachable for us throughout the build because of a DNS issue. We had to build a fallback decision engine because we could not call Compute at all.

The Storage SDK is one of the cleanest decentralized storage SDKs we have used. The Compute downtime cost us the ability to demo verifiable AI inference live, which is a core part of what 0G is selling.

## What worked well

- **0G Storage upload is reliable.** Every rebalance event gets logged on chain. We have hundreds of real uploads with tx hashes verifiable on the 0G explorer.
- **Merkle tree generation and root hash verification just works.** Drop in the SDK, get a root hash, store it, retrieve later, all transparent.
- **TypeScript SDK (`@0gfoundation/0g-ts-sdk`) is straightforward.** Clean API, predictable shape, good error responses (most of the time).
- **Storage nodes are responsive.** Upload latency was reasonable, no timeouts on small files.
- **`skipIfFinalized: true` is a nice touch.** Saved us from duplicate uploads when retrying.
- **The Indexer + Flow contract pattern makes sense.** Once you understand the mental model, it composes well.
- **Galileo testnet has been stable since we got tokens.** No infrastructure issues with Storage uploads after the initial token funding.

## The big problem: 0G Compute is completely unreachable

For the entire build window we hit:

```
[Brain] 0G Compute call failed: getaddrinfo ENOTFOUND compute-testnet.0g.ai
```

Every single cycle. From Apr 24 through Apr 30. From three different networks. Persistent DNS failure.

This meant we could not:
- Call 0G Compute for AI reasoning (the brain module's core feature)
- Demonstrate verifiable inference live in the demo
- Use the "AI deciding when to rebalance" story which is half the pitch

We had to build a full threshold based fallback decision engine just to keep the agent running. The fallback works but it is dumb logic, not AI. The whole point of building on 0G was the verifiable inference layer.

We tried:
- Different DNS resolvers
- VPN
- Different networks (home, hotspot, coworking)
- Direct curl to the host

All failed with the same DNS error. The hostname does not resolve from any environment we tried.

**Suggestion:** publish a status page for 0G testnet infrastructure. Even a simple page showing which services are up. Right now there is no way for builders to know if it is them or you.

Also, having a documented backup endpoint or alternate URL would help. Right now if `compute-testnet.0g.ai` is down, builders are stuck.

## Chain ID confusion

`OG_CHAIN_ID` was easy to misconfigure. Older docs reference `16600` (Newton testnet, deprecated). Current Galileo is `16602`. Easy to miss the difference and end up with confusing failures because storage uploads silently revert with `require(false)` when on the wrong chain.

**Suggestion:** add a bold callout in current docs: *Use chainId 16602 (Galileo). 16600 is the deprecated Newton testnet.*

## Faucet UX is slow

0.1 0G/day with X account auth is fine for casual users but slow for hackathon builders. We needed to fund the agent wallet to enable real Storage uploads. A small fast-track for verified hackathon participants would help.

We ended up needing tokens from a friend to actually start uploading. If we had not had that contact, we would have been blocked for another day.

**Suggestion:** during hackathons, give registered participants a higher daily limit or a one time bigger drop.

## Smaller friction points

- **`replacement transaction underpriced` errors on rapid sequential uploads.** When the agent fires both an event upload and a KV upload in the same cycle, they compete for nonces. The SDK retries, but the noisy logs make it hard to tell what is actually failing.
- **Backup RPC not documented.** If the primary 0G RPC has issues, there is no fallback list.
- **No example of graceful degradation.** Would help to have a reference implementation showing how to handle Compute being down (which is what we had to do).

## Bugs hit

| Date | Component | Error | Workaround |
|------|-----------|-------|------------|
| Apr 24-30 | 0G Compute | `getaddrinfo ENOTFOUND compute-testnet.0g.ai` (persistent) | Built threshold fallback decision engine |
| Apr 27 | 0G Storage | Uploads reverted with `require(false)` until wallet had testnet tokens | Got tokens from a contact, uploads now work |
| Apr 27 | OG_CHAIN_ID | Used 16600 from older docs, all uploads failed | Switched to 16602 (Galileo) |
| Apr 30 | 0G Storage | `replacement fee too low` on sequential uploads | SDK retries, noisy but eventually succeeds |

## What we wish existed

1. **Status page for 0G testnet.** Especially Compute. So we know if it is us or you.
2. **Hackathon faucet tier.** Bigger initial drop for registered hackathon participants.
3. **Backup RPC list.** Documented alternatives for both Storage and Compute.
4. **Compute mock/stub mode.** For development. So we can build against the API contract even when the real service is down.
5. **Example of graceful Compute fallback.** Reference code showing how to handle Compute being unreachable, since this happened to us.
6. **Better chain ID highlighting.** Big bold callout in current docs that 16602 is the active testnet.

## What we shipped

Despite Compute being unreachable, Voltaire integrates 0G Storage extensively:

- Every rebalance event is logged via `LogMemory.append()` to 0G Storage
- KV state (last run, config) is persisted via `KVMemory.set()`
- Hybrid persistence model: SQLite as fast local cache, 0G Storage as immutable on-chain audit trail
- Real tx hashes verifiable on the 0G explorer
- Sample real upload:
  - Tx: `0xaeebb0b75f6fec79aa0632560144d595f030108ad64245da8b212be861a14194`
  - Root hash: `0xdd9d8887d70a771f3170e834eb267fa04b8eff3154c8c162d654f6f1d40fd294`
  - txSeq: 61345
  - Network: Galileo (chainId 16602)

The 0G Storage integration lives in `core/memory/index.ts`. We document the Compute fallback decision in code comments so future builders know why the threshold logic is there.

For 0G Compute, our `core/brain/index.ts` is fully wired to call Compute. The moment your DNS resolves, real verifiable inference will replace the threshold fallback. No code changes needed.

## What worked best, in one sentence

**0G Storage delivers exactly what it promises.** Reliable, transparent, on chain, with a clean SDK. The audit trail story is real.

## Repo

[github.com/Kingnanaweb3/voltaire-ai](https://github.com/Kingnanaweb3/voltaire-ai)

The 0G integration lives in `core/memory/index.ts` (Storage) and `core/brain/index.ts` (Compute).

## Contact

X: [@AlmondWeb3](https://x.com/AlmondWeb3)
