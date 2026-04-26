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
  status: 'skipped' | 'executed' | 'failed';
}

export interface AgentConfig {
  walletAddress: string;
  targetRatios: Record<string, number>;
  driftThreshold: number;
  cronSchedule: string;
  chainId: number;
}