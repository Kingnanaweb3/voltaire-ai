# KeeperHub Builder Feedback

Honest builder feedback from shipping Voltaire AI on KeeperHub MCP.

**Project:** Voltaire AI — autonomous portfolio rebalancing agent
**Builder:** AlmondWeb3 ([@AlmondWeb3](https://x.com/AlmondWeb3))
**Hackathon:** ETHGlobal Open Agents
**Build window:** April 24 – May 3, 2026

## TL;DR

KeeperHub MCP is the right pattern for agent execution. Once we got past three rough edges, it became one of the most reliable parts of our stack. The MCP abstraction is great, but the recipient field naming, the workflow vs direct execution split, and the txHash hidden in nested response burned hours.

## What worked well

- **MCP session auth is clean.** Once you understand the initialize handshake, the rest just works. Session ID in headers, every tool call goes through cleanly.
- **`tools/list` is gold for discovery.** That is how we found `execute_transfer`. The full tool schema with parameters made it easy to figure out what was possible.
- **`execute_transfer` direct tool just works.** Once we found it, every call was reliable. Status polling returned clean structured data.
- **`get_direct_execution_status` returns clear responses.** `executionId`, `status`, `transactionHash`, `gasUsedWei` all there in a predictable shape.
- **Workflow creation and deletion APIs are reliable.** No flakiness across hundreds of calls.
- **`list_action_schemas` is helpful for discovery.** Lets you see all available action types upfront.

## The big rough edges

### 1. Recipient field is named differently across tools

This burned us for hours. Three different field names mean the same thing depending on which tool you call:

| Tool | Field name |
|------|------------|
| `create_workflow` (web3/transfer-funds node) | `recipientAddress` |
| Some examples in docs | `recipient` |
| `execute_transfer` direct tool | `recipient_address` |

When we used `toAddress` (which is what some examples showed), the workflow silently accepted it but every execution failed with `Invalid recipient address: undefined`. The error gave no hint that the field name was wrong.

**Suggestion:** standardize to one name across all tools. `recipientAddress` makes sense everywhere.

### 2. Workflow vs direct execution distinction is not obvious

There are two separate flows:
- Workflow based: `create_workflow` → `execute_workflow` → `get_execution_status`
- Direct: `execute_transfer` or `execute_contract_call` → `get_direct_execution_status`

We started with workflows because the first thing we found in docs was `create_workflow`. Spent hours building a workflow flow before realizing direct execution existed and was much simpler for our use case.

Even worse, using the wrong status tool silently returns wrong data. `get_execution_status` for a direct execution returns nothing useful, no error, just empty response. Easy to think the tx failed when it actually succeeded.

**Suggestion:** add a prominent "Direct Execution Quickstart" section to the docs. Most agent builders just need to fire one transfer or one contract call. The workflow pattern is for more complex pipelines.

### 3. txHash hidden in nested response

When `execute_transfer` completes, you would expect `result.txHash` or `result.transactionHash`. Instead the actual hash is sometimes in:
- `result.transactionHash`
- `result.tx_hash`
- `result.transaction_hash`
- `result.hash`
- `result.data.txHash`
- Nested inside `get_execution_logs` response

We had to write a recursive search across multiple field names to reliably find it. Sometimes `get_execution_logs` returned `[]` empty even when the execution succeeded.

**Suggestion:** standardize one field, `txHash`, returned by every direct execution tool at the top level.

## Smaller friction points

- **Old workflows reused silently.** Our `getOrCreateRebalancerWorkflow` reused existing workflows even after config had changed. No way to know the live workflow had stale config without manual deletion.
- **`force: true` parameter undocumented.** Required to delete active workflows but not in the public docs. We discovered it by trial and error.
- **`execute_transfer` sends 0 ETH when value is 0.** Uniswap ERC20 swap txs have `value: 0` because the swap is encoded in calldata, not native ETH. `execute_transfer` with amount 0 silently succeeds but does nothing. Took hours to figure out we needed `execute_contract_call` instead.
- **Intermittent ECONNRESET on `mcp.keeperhub.com`.** Maybe 1 in 20 calls. Forced us to add retry-with-backoff. Connection stability would help long-running agents.
- **No way to update workflow node config without deleting and recreating.** Means stale config sticks around unless you actively manage lifecycle.

## Bugs hit

| Date | Tool | Error | Workaround |
|------|------|-------|------------|
| Apr 26 | `create_workflow` | `Invalid recipient address: undefined` on every execution | Discovered `execute_transfer` direct tool via `tools/list` |
| Apr 26 | Workflow reuse | Stale config reused silently across runs | Added delete-before-create logic |
| Apr 27 | `execute_transfer` | `amount: 0.0 ETH` for Uniswap ERC20 swap completed silently with no swap | Need `execute_contract_call` with raw calldata for ERC20 swaps |
| Apr 27 | `get_execution_status` | Returns nothing useful for direct executions | Switched to `get_direct_execution_status` |
| Apr 30 | KeeperHub session | Intermittent ECONNRESET on `mcp.keeperhub.com` | Added retry-with-backoff |

## What we wish existed

1. **Direct Execution Quickstart in docs.** Most agent builders just need a transfer or a contract call. Surface `execute_transfer` as the default first example, not workflows.
2. **Standardized field names.** One `recipientAddress` everywhere. One `txHash` at the top level of every execution response.
3. **Workflow config validation at create time.** Catch bad node configs (like wrong recipient field name) before the workflow runs and silently fails.
4. **Webhook on execution status.** Right now we poll. A webhook on completed/failed would close the loop cleanly.
5. **Auto-cleanup of stale workflows.** Or at least a flag to recreate-on-config-change so you do not silently use old configs.
6. **Better error messages.** "Invalid recipient address: undefined" should tell you which field was missing or misnamed.

## What we shipped

KeeperHub powers every transaction in Voltaire:

- Every rebalance cycle calls `execute_transfer` via MCP
- Real txs on Base Sepolia, real BaseScan-verifiable hashes
- Real gas tracking via `gasUsedWei` and `gasPriceWei`
- Real audit URLs (`https://app.keeperhub.com/executions/{id}`) surfaced in the dashboard
- Retry counter persisted with every event

Sample real execution:
- Execution ID: `uqwyif40pxyuyx7q47ry6`
- Tx hash: `0xaeebb0b75f6fec79aa0632560144d595f030108ad64245da8b212be861a14194`
- Gas: 21000 × 6000000 wei = $0.0003
- Audit: `https://app.keeperhub.com/executions/uqwyif40pxyuyx7q47ry6`

The MCP integration lives in `core/executor/index.ts`. We document the recipient-field gotcha in code comments so future builders avoid it.

## What worked best, in one sentence

**The MCP server abstraction is the right call.** It makes us think of KeeperHub as a tool not a vendor. Strong DX on this level.

## Repo

[github.com/Kingnanaweb3/voltaire-ai](https://github.com/Kingnanaweb3/voltaire-ai)

## Contact

X: [@AlmondWeb3](https://x.com/AlmondWeb3)
