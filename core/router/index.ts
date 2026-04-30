// ─── Voltaire AI — Router Module (Uniswap API) ──────────────────────────────

import axios from 'axios';
import { QuoteResult, UnsignedTransaction } from '../types';

export const TOKENS: Record<string, string> = {
  // Base Sepolia testnet
  ETH: '0x0000000000000000000000000000000000000000',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
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
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    if (!this.apiKey) throw new Error('UNISWAP_API_KEY required for quotes');
    console.log('[Router] apiKey:', this.apiKey?.slice(0, 8), 'url:', this.apiUrl, 'swapper:', params.walletAddress);

    const tokenInAddress  = TOKENS[params.tokenIn]  || params.tokenIn;
    const tokenOutAddress = TOKENS[params.tokenOut] || params.tokenOut;

    let res;
    try {
      res = await axios.post(`${this.apiUrl}/quote`, {
        type: 'EXACT_INPUT',
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        tokenInChainId: this.chainId,
        tokenOutChainId: this.chainId,
        amount: params.amountIn,
        swapper: params.walletAddress,
        slippageTolerance: 0.5,
      }, { headers: this.headers });
    } catch (err: any) {
      // Trade API doesn't support Base Sepolia (chain 84532) — fall back to deterministic mock
      // This keeps the agent functional on testnet. Real Uniswap calls used on mainnet (chain 8453).
      const isTestnet = this.chainId === 84532;
      if (isTestnet) {
        console.warn('[Router] REAL ERROR — status:', err?.response?.status, 'data:', JSON.stringify(err?.response?.data)?.slice(0,300));
        console.warn('[Router] Trade API unavailable for Base Sepolia — using mock quote');
        const ETH_USDC_RATE = 2260; // approximate, only used for testnet mock
        const isEthIn = params.tokenIn === 'ETH';
        const amountInBig = BigInt(params.amountIn);
        const mockOut = isEthIn
          ? (amountInBig * BigInt(Math.floor(ETH_USDC_RATE * 1e6))) / BigInt(1e18)  // ETH wei → USDC (6 dec)
          : (amountInBig * BigInt(1e18)) / BigInt(Math.floor(ETH_USDC_RATE * 1e6)); // USDC (6 dec) → ETH wei
        return {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          amountOut: mockOut.toString(),
          route: 'MOCK_TESTNET',
          priceImpact: 0.01,
          gasEstimate: '21000',
          quoteId: `mock_${Date.now()}`,
          expiresAt: Date.now() + 30_000,
          rawQuote: { mock: true, reason: 'Trade API does not support Base Sepolia' },
        } as any;
      }
      throw err;
    }

    const data = res.data;

    const priceImpact = parseFloat(data.quote?.priceImpact || '0');
    const maxImpact = parseFloat(process.env.MAX_PRICE_IMPACT || '1.0');
    if (priceImpact > maxImpact) {
      throw new Error(`[Router] Slippage protection triggered — price impact ${priceImpact}% exceeds max ${maxImpact}%. Swap skipped.`);
    }

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
    // If the quote is a testnet mock, return a deterministic tx — Trade API can't build for Sepolia
    if ((params.quote as any).route === 'MOCK_TESTNET' || (params.quote.rawQuote as any)?.mock) {
      console.warn('[Router] Building mock swap tx — Trade API does not support Base Sepolia');
      return {
        to: '0x492e6456d9528771018deb9e87ef7750ef184104', // Universal Router (Base Sepolia)
        data: '0x',
        value: params.quote.tokenIn === 'ETH' ? params.quote.amountIn : '0',
        gasLimit: '300000',
        chainId: this.chainId,
      } as any;
    }
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