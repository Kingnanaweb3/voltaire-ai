// ─── Voltaire AI — Brain Module (0G Compute) ────────────────────────────────
import axios from 'axios';
import { PortfolioState, SwapDecision } from '../types';

export interface IBrain {
  decide(state: PortfolioState): Promise<SwapDecision>;
  explain(decision: SwapDecision): Promise<string>;
}

export class OGComputeBrain implements IBrain {
  private apiUrl: string;
  private model: string;

  constructor() {
    // Don't throw — fall back gracefully if not configured
    this.apiUrl = process.env.OG_COMPUTE_URL || '';
    this.model  = process.env.OG_COMPUTE_MODEL || 'qwen3-6b-plus';
    if (!this.apiUrl) {
      console.warn('[Brain] OG_COMPUTE_URL not set — will use threshold fallback');
    }
  }

  async decide(state: PortfolioState): Promise<SwapDecision> {
    if (!this.apiUrl) throw new Error('OG_COMPUTE_URL not configured');

    const prompt = this.buildPrompt(state);
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );

      const content = response.data.choices[0].message.content;
      const parsed  = JSON.parse(content);

      return {
        shouldSwap: parsed.should_swap,
        tokenIn:    parsed.token_in,
        tokenOut:   parsed.token_out,
        amountIn:   parsed.amount_in_wei,
        reasoning:  parsed.reasoning,
        confidence: parsed.confidence,
      };
    } catch (err: any) {
      console.warn('[Brain] 0G Compute call failed:', err.message);
      throw err; // Let caller handle fallback
    }
  }

  async explain(decision: SwapDecision): Promise<string> {
    if (!decision.shouldSwap) return 'Portfolio within target range — no rebalance needed.';
    return decision.reasoning;
  }

  private buildPrompt(state: PortfolioState): string {
    return `You are Voltaire, an autonomous DeFi portfolio rebalancing agent.

Current portfolio:
${JSON.stringify(state.currentRatios, null, 2)}

Target ratios:
${JSON.stringify(state.targetRatios, null, 2)}

Drift from target:
${JSON.stringify(state.driftAmounts, null, 2)}

Max drift: ${(state.maxDrift * 100).toFixed(2)}%
Total portfolio value: $${state.totalUsdValue.toFixed(2)}

Respond ONLY with valid JSON:
{
  "should_swap": boolean,
  "token_in": "ETH" or "USDC" or "",
  "token_out": "ETH" or "USDC" or "",
  "amount_in_wei": "wei amount as string or 0",
  "reasoning": "one sentence",
  "confidence": 0.0 to 1.0
}`;
  }
}