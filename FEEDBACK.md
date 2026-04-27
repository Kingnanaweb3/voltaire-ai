# Builder Feedback — Voltaire AI

**Project:** Voltaire AI — Autonomous Portfolio Rebalancing Agent
**Builder:** AlmondWeb3 | @AlmondWeb3 on X
**Hackathon:** 0G Labs x Uniswap x KeeperHub Hackathon
**Date range:** April 24 – May 3, 2026

---

## UNISWAP API

### What worked well
- The `/quote` endpoint worked on first try with a clean response — tokenIn, tokenOut, amountIn, routing, priceImpact all returned correctly
- `CLASSIC` routing on Base Sepolia was reliable and fast across all test calls
- The `x-api-key` header auth is simple and predictable
- Price impact percentage was useful for building slippage protection logic
- Quote responses are well-structured and easy to map to TypeScript interfaces
- Base Sepolia testnet had good liquidity for ETH/USDC — quotes returned consistently

### Friction points
- **No Base Sepolia token address list in docs** — had to find WETH and USDC addresses from third-party sources
- **`swapper` field requirement not obvious** — buried in docs, missing it causes unclear errors
- **No sandbox/mock mode** — every test call consumes real API quota
- **`tokenInChainId` and `tokenOutChainId` vs `chainId`** — separate chain ID fields caused initial confusion
- **Swap transaction `value` field is `0` for ERC20 swaps** — broke our KeeperHub execute_transfer integration. Not documented explicitly
- **Quote expiry not surfaced clearly** — stale quotes cause silent failures in autonomous agents
- **No TypeScript SDK** — had to hand-write all types and fetch wrappers

### Bugs hit

| Date | Endpoint | Error | Workaround |
|------|----------|-------|------------|
| Apr 26 | /quote | swapper field missing caused unclear error | Added swapper: walletAddress to all quote requests |
| Apr 27 | Swap tx execution | value: 0 on ETH→USDC swap broke execute_transfer | Switched to execute_contract_call with raw calldata |
| Apr 27 | /quote | No Base Sepolia token addresses in docs | Found WETH + USDC addresses from external sources |

### Documentation gaps
- No testnet token address reference per chain
- swapper field not highlighted as required in quick start
- No explanation of why value is 0 on ERC20 swaps
- No rate limit documentation for free tier
- No TypeScript SDK

### Missing features
- GET /tokens?chainId=84532 — verified token list per chain
- GET /quote/stream — streaming quotes for real-time agent decisions
- POST /swap/simulate — dry-run without submitting to chain
- TypeScript/Node.js SDK for backend agent builders

### DX improvements
- Add a Builder quickstart for agents guide — most docs assume frontend wallet context
- Document the value: 0 behavior on ERC20 swaps explicitly
- Publish verified testnet token addresses
- Clearer error messages when required fields are missing

---

## KEEPERHUB MCP

### What worked well
- MCP session-based auth worked cleanly once the initialize pattern was understood
- tools/list returned a well-structured schema useful for discovery
- execute_transfer direct tool worked once discovered
- get_direct_execution_status returned clear structured responses
- Workflow creation and deletion APIs worked reliably
- list_action_schemas was very helpful for discovering available action types

### Friction points
- **web3/transfer-funds workflow node toAddress field silently ignored** — KeeperHub kept returning Invalid recipient address: undefined. The actual required field is recipientAddress
- **Three different field names for recipient across tools** — toAddress in workflow node config, recipient in some references, recipient_address in execute_transfer. Inconsistent naming burned significant debugging time
- **Workflow-based vs direct execution not clearly differentiated** — execute_transfer and execute_contract_call are direct tools, execute_workflow is a separate flow. Distinction not obvious upfront
- **Old workflows reused silently** — getOrCreateRebalancerWorkflow reused existing workflows even after config changed. No way to know if live workflow had stale config
- **get_execution_status vs get_direct_execution_status** — two different status polling tools depending on execution method. Using the wrong one silently returns wrong data
- **execute_transfer sends 0 ETH for Uniswap swaps** — Uniswap swap txs have value: 0 (ERC20 swap via WETH), so execute_transfer with amount 0.0 technically succeeds but does nothing
- **No prominent docs on execute_transfer direct tool** — had to discover it via tools/list
- **delete_workflow force parameter** — not documented but required to delete active workflows

### Bugs hit

| Date | Tool | Error | Workaround |
|------|------|-------|------------|
| Apr 26 | create_workflow | Invalid recipient address: undefined on every execution | Discovered execute_transfer direct tool via tools/list |
| Apr 27 | execute_transfer | Amount 0.0 ETH passed silently — swap tx value is always 0 for ERC20 | Need execute_contract_call with Uniswap calldata |
| Apr 27 | get_execution_status | Wrong tool for direct executions | Switched to get_direct_execution_status |
| Apr 26 | Workflow reuse | Stale workflow config reused silently across runs | Added delete-before-create logic |

### Documentation gaps
- Recipient field naming inconsistency not documented (toAddress vs recipient vs recipient_address)
- No clear guide distinguishing workflow-based vs direct execution
- execute_transfer and direct tools not prominently featured
- No mention that force: true is needed to delete active workflows
- get_direct_execution_status vs get_execution_status distinction not explained

### Missing features
- A direct execution quickstart guide separate from workflow creation
- Consistent field naming across all tools
- Workflow config validation at creation time
- Way to update workflow node config without deleting and recreating

### DX improvements
- Standardize recipient field name across all tools to recipientAddress
- Add a prominent Direct Execution section to docs
- Validate node config fields at create_workflow time
- Add quickstart for autonomous agent builders

---

## 0G LABS

### What worked well
- 0G Storage upload worked reliably — every rebalance event logged successfully on-chain
- Merkle tree generation and root hash verification worked as expected
- Storage nodes were responsive and fast
- The TypeScript SDK (@0gfoundation/0g-ts-sdk) was straightforward to integrate
- skipIfFinalized: true flag was useful for avoiding duplicate uploads
- Full audit trail working — transaction hashes returned correctly for every upload

### Friction points
- **0G Compute DNS failure** — compute-testnet.0g.ai was completely unreachable (getaddrinfo ENOTFOUND). The brain module could not call 0G Compute at all throughout development. Had to build a full threshold fallback to keep the agent functional
- **No fallback RPC documented** — when the primary 0G RPC had issues, no backup was documented
- **Compute testnet instability** — DNS failure was persistent across multiple days, not transient. Made it impossible to demonstrate 0G Compute reasoning live

### Bugs hit

| Date | Component | Error | Workaround |
|------|-----------|-------|------------|
| Apr 24-27 | 0G Compute | getaddrinfo ENOTFOUND compute-testnet.0g.ai | Built drift threshold fallback decision engine |
| Apr 27 | Base Sepolia RPC | Duplicate BASE_SEPOLIA_RPC in .env caused SSL bad record mac error | Deduplicated env var, switched to publicnode RPC |

### Documentation gaps
- No backup RPC endpoints listed for when primary is down
- No status page for 0G testnet infrastructure
- 0G Compute testnet availability and uptime expectations not documented

### Missing features
- 0G Compute testnet status page / health endpoint
- Documented fallback RPC list for Storage and Compute
- Example of graceful degradation when Compute is unavailable

### DX improvements
- Add a health check endpoint for 0G Compute so agents can detect availability before calling
- Publish a list of stable backup RPCs for testnet builders
- Consider a mock/stub mode for 0G Compute during development
