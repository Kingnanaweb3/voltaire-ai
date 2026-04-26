// ─── Voltaire AI — Router Module (Uniswap API) ──────────────────────────────

import axios from 'axios';
import { QuoteResult, UnsignedTransaction } from '../types';

export const TOKENS: Record<string, string> = {
  // Base mainnet
  ETH:  '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export interface QuoteParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  walletAddress: string;
}

export interface SwapParams {
  quote: QuoteResult;
  walletAddress: string;
  slippageTolerance?: number;
}

export class UniswapRouter {
  private apiUrl: string;
  private apiKey: string;
  private chainId: number;

  constructor() {
    this.apiUrl  = process.env.UNISWAP_API_URL || 'https://trade-api.gateway.uniswap.org/v1';
    this.apiKey  = process.env.UNISWAP_API_KEY || '';
    this.chainId = parseInt(process.env.CHAIN_ID || '8453');
    if (!this.apiKey) console.warn('[Router] UNISWAP_API_KEY not set');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    if (!this.apiKey) throw new Error('UNISWAP_API_KEY required for quotes');
    console.log('[Router] apiKey:', this.apiKey?.slice(0, 8), 'url:', this.apiUrl, 'swapper:', params.walletAddress);

    const tokenInAddress  = TOKENS[params.tokenIn]  || params.tokenIn;
    const tokenOutAddress = TOKENS[params.tokenOut] || params.tokenOut;

    const res = await axios.post(`${this.apiUrl}/quote`, {
      type: 'EXACT_INPUT',
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      tokenInChainId: this.chainId,
      tokenOutChainId: this.chainId,
      amount: params.amountIn,
      swapper: params.walletAddress,
      slippageTolerance: 0.5,
    }, { headers: this.headers });

    const data = res.data;

    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: data.quote?.output?.amount || data.quote?.outputAmount || '0',
      route: data.routing || 'unknown',
      priceImpact: parseFloat(data.quote?.priceImpact || '0'),
      gasEstimate: data.quote?.gasUseEstimate || '0',
      quoteId: data.quoteId || `quote_${Date.now()}`,
      expiresAt: Date.now() + 30_000,
      rawQuote: data.quote,
    };
  }

  async buildSwap(params: SwapParams): Promise<UnsignedTransaction> {
    if (!this.apiKey) throw new Error('UNISWAP_API_KEY required');
    try {
      const res = await axios.post(`${this.apiUrl}/swap`, {
        quote: params.quote.rawQuote,
      }, { headers: this.headers });

      const tx = res.data.swap;
      return {
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
        gasLimit: tx.gasLimit || '300000',
        chainId: this.chainId,
      };
    } catch (err: any) {
      console.error('[Router] buildSwap error:', JSON.stringify(err.response?.data));
      throw err;
    }
  }

  async getSwapStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const res = await axios.get(
        `${this.apiUrl}/swap/status?txHash=${txHash}`,
        { headers: this.headers }
      );
      const s = res.data.status;
      if (s === 'CONFIRMED') return 'confirmed';
      if (s === 'FAILED') return 'failed';
      return 'pending';
    } catch {
      return 'pending';
    }
  }
}