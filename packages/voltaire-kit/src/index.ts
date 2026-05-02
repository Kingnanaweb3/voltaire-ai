/**
 * VoltaireKit — DeFi agent framework
 *
 * Core primitives for building autonomous DeFi agents on 0G + EVM chains.
 * Voltaire AI (the rebalancer) is the first agent built on this kit.
 */

// Brain — LLM reasoning with 0G Compute + threshold fallback
export { OGComputeBrain as Brain, OGComputeBrain } from '../../../core/brain';

// Memory — SQLite KV + 0G Storage hybrid persistence
export { KVMemory as AgentMemory, KVMemory, LogMemory } from '../../../core/memory';

// Executor — KeeperHub MCP integration for verifiable execution
export { KeeperHubExecutor } from '../../../core/executor';

// Router — Uniswap Trade API integration
export { UniswapRouter, TOKENS } from '../../../core/router';

// Triggers — scheduled + instruction-based agent activation
export { ScheduledTrigger, InstructionTrigger } from '../../../core/trigger';

// Types — shared agent contracts
export type {
  PortfolioState,
  SwapDecision,
  RebalanceEvent,
} from '../../../core/types';

// Swarm — multi-agent shared state via 0G Storage
export { SwarmCoordinator } from './SwarmCoordinator';
export type { SwarmSignal, SwarmAgentInfo } from './SwarmCoordinator';

// NFT — ERC-7857 agent identity
export { NFTMinter } from './NFTMinter';
export type { AgentNFTMetadata, MintRequest } from './NFTMinter';
// Sat May  2 16:20:22 WAT 2026
// redeploy
// cors update
// http trigger
// fix2 1777737891
// sqlite revert 1777738374
// concurrently fix 1777739213
// concurrently deps fix 1777739727
