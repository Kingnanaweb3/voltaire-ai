// ─── Voltaire AI — Memory Module (0G Storage + SQLite cache) ────────────────
// 0G Storage = immutable audit trail (writes async, append-only).
// SQLite     = local mirror for fast cross-process reads (API + agent share).
import {
  Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
import { RebalanceEvent, AgentConfig } from '../types';
import {
  addRebalance,
  getRebalancesByAddress,
  getRebalances,
  setState as dbSetState,
  getState as dbGetState,
} from '../../db';

function getConnection() {
  const rpcUrl = process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
  const indexerUrl = process.env.OG_INDEXER_URL || 'https://indexer-storage-testnet-turbo.0g.ai';
  const privateKey = process.env.AGENT_PRIVATE_KEY || '';
  if (!privateKey) throw new Error('AGENT_PRIVATE_KEY is required');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(indexerUrl);
  return { indexer, signer, rpcUrl };
}

export interface IMemory {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

export class KVMemory implements IMemory {
  async get(key: string): Promise<any> {
    const v = dbGetState<any>(key);
    return v ?? null;
  }

  async set(key: string, value: any): Promise<void> {
    dbSetState(key, value);
    this.backupTo0G(key, value).catch(err =>
      console.warn(`[KVMemory] 0G backup failed for "${key}":`, err?.message ?? err)
    );
  }

  private async backupTo0G(key: string, value: any): Promise<void> {
    const { indexer, signer, rpcUrl } = getConnection();
    const encoded = new TextEncoder().encode(JSON.stringify({ key, value, ts: Date.now() }));
    const memData = new MemData(encoded);
    const [, treeErr] = await memData.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);
    const [, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);
  }

  async getConfig(): Promise<AgentConfig | null> { return this.get('agent:config'); }
  async setConfig(config: AgentConfig): Promise<void> { return this.set('agent:config', config); }
  async getLastRun(): Promise<number | null> { return this.get('agent:last_run'); }
  async setLastRun(timestamp: number): Promise<void> { return this.set('agent:last_run', timestamp); }
}

export class LogMemory {
  async append(event: RebalanceEvent): Promise<void> {
    try {
      const ev: any = event;
      const dec = ev.decision ?? {};
      const exec = ev.execution ?? {};
      const port = ev.portfolioState ?? {};

      const statusMap: Record<string, 'success' | 'failed' | 'skipped'> = {
        'executed': 'success',
        'stop-loss-executed': 'success',
        'failed': 'failed',
        'stop-loss-failed': 'failed',
        'skipped': 'skipped',
        'stop-loss': 'skipped',
      };

      let ethPrice: number | undefined;
      const ethBal = port.balances?.find((b: any) => b.symbol === 'ETH');
      if (ethBal?.usdValue && ethBal?.amount) {
        const amt = parseFloat(ethers.formatEther(ethBal.amount));
        if (amt > 0) ethPrice = ethBal.usdValue / amt;
      }

      addRebalance({
        timestamp: ev.timestamp ?? Date.now(),
        from_asset: dec.tokenIn ?? '',
        to_asset: dec.tokenOut ?? '',
        from_amount: Number(dec.amountIn ?? 0),
        to_amount: Number(ev.quote?.amountOut ?? 0),
        eth_price: ethPrice ?? undefined,
        gas_cost_usd: exec.gasUsedUsd ?? exec.gasCostUsd ?? undefined,
        tx_hash: exec.txHash ?? undefined,
        reasoning: dec.reasoning ?? '',
        status: statusMap[ev.status] ?? 'failed',
        trigger_type: dec.triggerType ?? undefined,
        total_usd_value: port.totalUsdValue ?? undefined,
        max_drift: port.maxDrift ?? undefined,
        portfolio_state: port && Object.keys(port).length > 0 ? JSON.stringify(port) : undefined,
        user_address: (process.env.AGENT_WALLET_ADDRESS || '').toLowerCase(),
        audit_url: exec.auditUrl ?? undefined,
        job_id: exec.jobId ?? undefined,
        retry_count: exec.retryCount ?? undefined,
      });
    } catch (err) {
      console.warn('[LogMemory] SQLite write failed:', err);
    }

    this.backupTo0G(event).catch(err =>
      console.warn('[LogMemory] 0G backup failed:', err?.message ?? err)
    );
  }

  private async backupTo0G(event: RebalanceEvent): Promise<void> {
    const { indexer, signer, rpcUrl } = getConnection();
    const encoded = new TextEncoder().encode(JSON.stringify(event));
    const memData = new MemData(encoded);
    const [tree, treeErr] = await memData.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);
    console.log(`[LogMemory] Uploading event ${(event as any).id} — root hash: ${tree?.rootHash()}`);
    const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);
    console.log(`[LogMemory] Event stored on 0G — tx: ${JSON.stringify(tx)}`);
  }

  async getHistory(limit = 100, userAddress?: string): Promise<RebalanceEvent[]> {
    const rows = getRebalancesByAddress(userAddress, limit);
    return rows
      .slice()
      .reverse()
      .map(r => ({
        id: String(r.id),
        timestamp: r.timestamp,
        status: r.status === 'success' ? 'executed' : r.status,
        decision: {
          tokenIn: r.from_asset,
          tokenOut: r.to_asset,
          amountIn: String(r.from_amount),
          amountOut: String(r.to_amount),
          reasoning: r.reasoning,
          shouldSwap: r.status === 'success',
        },
        quote: { amountOut: String(r.to_amount) },
        execution: r.tx_hash ? {
          txHash: r.tx_hash,
          gasUsedUsd: r.gas_cost_usd,
          auditUrl: (r as any).audit_url ?? undefined,
          jobId: (r as any).job_id ?? undefined,
          retryCount: (r as any).retry_count ?? 0,
        } : undefined,
        portfolioState: (() => {
          const raw = (r as any).portfolio_state;
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              return {
                totalUsdValue: parsed.totalUsdValue ?? (r as any).total_usd_value ?? 0,
                maxDrift: parsed.maxDrift ?? (r as any).max_drift ?? 0,
                balances: parsed.balances ?? [],
                currentRatios: parsed.currentRatios ?? {},
                targetRatios: parsed.targetRatios ?? {},
                driftAmounts: parsed.driftAmounts ?? {},
                walletAddress: parsed.walletAddress ?? '',
                timestamp: parsed.timestamp ?? r.timestamp,
              };
            } catch { /* fall through */ }
          }
          return {
            totalUsdValue: (r as any).total_usd_value ?? 0,
            maxDrift: (r as any).max_drift ?? 0,
            balances: [],
            currentRatios: {},
            targetRatios: {},
            driftAmounts: {},
            walletAddress: '',
            timestamp: r.timestamp,
          };
        })(),
      })) as unknown as RebalanceEvent[];
  }
}
