// ─── Voltaire AI — Shared Types ─────────────────────────────────────────────

export interface TokenBalance {
  symbol: string;
  address: string;
  amount: string;
  decimals: number;
  usdValue: number;
}

export interface PortfolioState {
  walletAddress: string;
  balances: TokenBalance[];
  totalUsdValue: number;
  currentRatios: Record<string, number>;
  targetRatios: Record<string, number>;
  driftAmounts: Record<string, number>;
  maxDrift: number;
  timestamp: number;
}

export interface SwapDecision {
  shouldSwap: boolean;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  reasoning: string;
  confidence: number;
}

export interface QuoteResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  route: string;
  priceImpact: number;
  gasEstimate: string;
  quoteId: string;
  expiresAt: number;
  rawQuote?: any;
}

export interface UnsignedTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  chainId: number;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  jobId: string;
  gasUsed?: string;
  gasCostUsd?: number;
  retryCount: number;
  confirmedAt?: number;
  error?: string;
  auditUrl?: string;
}

export interface RebalanceEvent {
  id: string;
  timestamp: number;
  portfolioState: PortfolioState;
  decision: SwapDecision;
  quote?: QuoteResult;
  execution?: ExecutionResult;
  status: 'skipped' | 'executed' | 'failed' | 'stop-loss' | 'stop-loss-executed' | 'stop-loss-failed';
}

export type TriggerType = 'drift' | 'price_drop' | 'price_floor' | 'time_based';

export interface CustomTrigger {
  type: TriggerType;
  // drift: rebalance when drift exceeds X%
  driftThreshold?: number;
  // price_drop: rebalance when ETH drops X% in 24h
  priceDropPercent?: number;
  // price_floor: rebalance when ETH price goes below $X
  priceFloor?: number;
  // time_based: rebalance every X hours
  intervalHours?: number;
}

export interface AgentConfig {
  walletAddress: string;
  targetRatios: Record<string, number>;
  driftThreshold: number;
  cronSchedule: string;
  chainId: number;
  // Custom trigger settings
  trigger: CustomTrigger;
  // Cooldown — min hours between rebalances
  cooldownHours: number;
  // Gas protection — skip if gas > X gwei
  maxGasGwei: number;
  // Stop-loss — convert all ETH to USDC if price drops below $X
  stopLossPrice: number;
  // Emergency pause — halt all agent activity
  paused: boolean;
  // Slippage protection — skip if price impact > X%
  maxPriceImpact: number;
}