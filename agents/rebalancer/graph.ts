// ─────────────────────────────────────────────────────────────────────────────
// agents/rebalancer — Voltaire Rebalancer Agent
// LangGraph state machine: fetch → drift → decide → quote → execute → log
// Built entirely using voltaire/core — demonstrates the framework
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from 'ethers';
import { OGComputeBrain } from '../../core/brain';
import { OGKVMemory, OGLogMemory, MEMORY_KEYS } from '../../core/memory';
import { UniswapRouter } from '../../core/router';
import { KeeperHubExecutor } from '../../core/executor';
import {
  PortfolioState, SwapDecision, QuoteResult,
  ExecutionResult, RebalanceEvent, AgentConfig
} from '../../core/types';
import { randomUUID } from 'crypto';

// ── Agent state ───────────────────────────────────────────────────────────────

interface RebalancerState {
  config: AgentConfig;
  portfolioState?: PortfolioState;
  decision?: SwapDecision | null;
  quote?: QuoteResult;
  execution?: ExecutionResult;
  reasoning?: string;
  error?: string;
  step: 'idle' | 'fetching' | 'deciding' | 'quoting' | 'executing' | 'logging' | 'done' | 'error';
}

// ── ERC-20 ABI (minimal — just balanceOf) ────────────────────────────────────

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// ── Rebalancer Agent ──────────────────────────────────────────────────────────

export class RebalancerAgent {
  private brain: OGComputeBrain;
  private kvMemory: OGKVMemory;
  private logMemory: OGLogMemory;
  private router: UniswapRouter;
  private executor: KeeperHubExecutor;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.brain = new OGComputeBrain();
    this.kvMemory = new OGKVMemory();
    this.logMemory = new OGLogMemory();
    this.router = new UniswapRouter();
    this.executor = new KeeperHubExecutor();
    this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    this.signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY || '', this.provider);
  }

  // ── Main run loop ─────────────────────────────────────────────────────────

  async run(): Promise<RebalancerState> {
    console.log('\n' + '═'.repeat(60));
    console.log('[Rebalancer] Starting rebalance cycle');
    console.log('═'.repeat(60));

    const state: RebalancerState = {
      config: this.config,
      step: 'fetching'
    };

    // Update agent status in KV
    await this.kvMemory.set(MEMORY_KEYS.AGENT_STATUS, { status: 'running', startedAt: Date.now() });

    try {
      // ── Node 1: Fetch balances ──────────────────────────────────────────
      console.log('\n[Node 1/6] Fetching portfolio balances...');
      state.portfolioState = await this.fetchBalances();
      state.step = 'deciding';

      // ── Node 2: Calculate drift (embedded in fetchBalances) ─────────────
      console.log(`[Node 2/6] Max drift: ${(state.portfolioState.maxDrift * 100).toFixed(1)}%`);

      // ── Node 3: Decide ─────────────────────────────────────────────────
      console.log('\n[Node 3/6] Running LLM decision engine...');
      state.decision = await this.brain.decide(state.portfolioState);
      state.reasoning = state.decision ? await this.brain.explain(state.decision) : 'No rebalance needed';
      state.step = 'quoting';

      if (!state.decision?.shouldSwap) {
        console.log('[Node 3/6] Decision: HOLD — no rebalance needed');
        state.step = 'done';
        await this.kvMemory.set(MEMORY_KEYS.AGENT_STATUS, { status: 'idle', lastRun: Date.now() });
        return state;
      }

      console.log(`[Node 3/6] Decision: SWAP ${state.decision.tokenIn} → ${state.decision.tokenOut}`);

      // ── Node 4: Quote ───────────────────────────────────────────────────
      console.log('\n[Node 4/6] Getting Uniswap quote...');
      state.quote = await this.router.getQuote({
        tokenIn: this.router.resolveToken(state.decision.tokenIn),
        tokenOut: this.router.resolveToken(state.decision.tokenOut),
        amount: state.decision.amountIn,
        chainId: this.config.chainId,
        swapper: this.config.walletAddress
      });
      state.step = 'executing';

      // ── Node 5: Execute ─────────────────────────────────────────────────
      console.log('\n[Node 5/6] Building swap and submitting to KeeperHub...');
      const swapTx = await this.router.buildSwap({
        quote: state.quote,
        swapper: this.config.walletAddress
      });

      state.execution = await this.executor.execute(swapTx, {
        agent: 'voltaire-rebalancer',
        reason: state.decision.reason,
        quoteId: state.quote.quoteId
      });

      state.step = 'logging';
      console.log(`[Node 5/6] Execution ${state.execution.status} — txHash: ${state.execution.txHash}`);

      // ── Node 6: Log to 0G Storage ───────────────────────────────────────
      console.log('\n[Node 6/6] Logging rebalance event to 0G Storage...');
      const event: RebalanceEvent = {
        id: randomUUID(),
        timestamp: Date.now(),
        portfolioState: state.portfolioState,
        decision: state.decision,
        quote: state.quote,
        execution: state.execution,
        reasoning: state.reasoning || ''
      };

      await this.logMemory.append(MEMORY_KEYS.REBALANCE_HISTORY, event);
      await this.kvMemory.set(MEMORY_KEYS.LAST_REBALANCE, event);
      await this.kvMemory.set(MEMORY_KEYS.PORTFOLIO_STATE, state.portfolioState);

      state.step = 'done';
      await this.kvMemory.set(MEMORY_KEYS.AGENT_STATUS, {
        status: 'idle',
        lastRun: Date.now(),
        lastTxHash: state.execution.txHash
      });

      console.log('\n' + '═'.repeat(60));
      console.log('[Rebalancer] Cycle complete ✓');
      console.log('═'.repeat(60) + '\n');

    } catch (error) {
      state.step = 'error';
      state.error = error instanceof Error ? error.message : String(error);
      console.error('[Rebalancer] Error in run cycle:', state.error);
      await this.kvMemory.set(MEMORY_KEYS.AGENT_STATUS, { status: 'error', error: state.error });
    }

    return state;
  }

  // ── Fetch balances and calculate drift ────────────────────────────────────

  private async fetchBalances(): Promise<PortfolioState> {
    const balances = [];
    let totalValueUSD = 0;

    // Fetch ETH balance
    const ethBalance = await this.provider.getBalance(this.config.walletAddress);
    const ethFormatted = parseFloat(ethers.formatEther(ethBalance));
    // NOTE: In production, fetch real ETH price from an oracle
    const ethPrice = 3000; // placeholder — replace with real price feed
    const ethValueUSD = ethFormatted * ethPrice;
    totalValueUSD += ethValueUSD;

    balances.push({
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      amount: ethBalance.toString(),
      amountFormatted: ethFormatted,
      valueUSD: ethValueUSD
    });

    // Fetch USDC balance
    const usdcContract = new ethers.Contract(
      this.router.resolveToken('USDC'),
      ERC20_ABI,
      this.provider
    );
    const usdcBalance = await usdcContract.balanceOf(this.config.walletAddress) as bigint;
    const usdcFormatted = parseFloat(ethers.formatUnits(usdcBalance, 6));
    totalValueUSD += usdcFormatted;

    balances.push({
      symbol: 'USDC',
      address: this.router.resolveToken('USDC'),
      amount: usdcBalance.toString(),
      amountFormatted: usdcFormatted,
      valueUSD: usdcFormatted
    });

    // Calculate current ratios
    const currentRatios: Record<string, number> = {};
    const drift: Record<string, number> = {};
    let maxDrift = 0;

    for (const balance of balances) {
      currentRatios[balance.symbol] = totalValueUSD > 0 ? balance.valueUSD / totalValueUSD : 0;
      drift[balance.symbol] = currentRatios[balance.symbol] - (this.config.targetRatios[balance.symbol] || 0);
      maxDrift = Math.max(maxDrift, Math.abs(drift[balance.symbol]));
    }

    return {
      walletAddress: this.config.walletAddress,
      totalValueUSD,
      balances,
      targetRatios: this.config.targetRatios,
      currentRatios,
      drift,
      maxDrift,
      timestamp: Date.now()
    };
  }
}
