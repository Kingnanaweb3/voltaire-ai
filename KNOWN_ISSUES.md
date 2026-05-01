# Known Issues

## graph.ts excluded from type-check
`agents/rebalancer/graph.ts` is a parallel LangGraph experiment, not on the runtime path. Runtime uses `agents/rebalancer/index.ts`. Will be reconciled with current core API in a follow-up.

## 0G Compute DNS unreachable
`compute-testnet.0g.ai` returns DNS errors from current dev environment. Threshold-based fallback in `core/brain` handles this gracefully. Documented in `FEEDBACK_0G.md`.

## 0G Storage "replacement fee too low"
Sequential uploads occasionally retry with this error before succeeding. Non-blocking. Documented in `FEEDBACK_0G.md`.

## Uniswap Trade API on Sepolia
No testnet liquidity → all quote endpoints return 404. Mock fallback in `core/router` documented in `FEEDBACK.md`.
