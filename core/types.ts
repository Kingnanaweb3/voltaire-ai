// ─── Voltaire AI — Shared Types ─────────────────────────────────────────────

export interface TokenBalance {
  symbol: string;
  address: string;
  amount: string;       // raw wei string
  decimals: number;
  usdValue: number;
}

export interface PortfolioState {
  walletAddress: string;
  balances: TokenBalance[];
  totalUsdValue: number;
  currentRatios: Record<string, number>;  // { ETH: 0.65, USDC: 0.35 }
  targetRatios: Record<string, number>;   // { ETH: 0.60, USDC: 0.40 }
  driftAmounts: Record<string, number>;   // { ETH: 0.05, USDC: -0.05 }
  maxDrift: number;
  timestamp: number;
}

export interface SwapDecision {
  shouldSwap: boolean;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;     // wei
  reasoning: string;
  confidence: number;   // 0-1
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
