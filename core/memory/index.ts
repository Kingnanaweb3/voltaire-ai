// ─── Voltaire AI — Memory Module (0G Storage + SQLite cache) ────────────────
// 0G Storage = immutable audit trail (writes async, append-only).
// SQLite     = local mirror for fast cross-process reads (API + agent share).
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
import { RebalanceEvent, AgentConfig } from '../types';
import {
  addRebalance,
  getRebalances,
  setState as dbSetState,
  getState as dbGetState,
} from '../../db';

// ─── Shared 0G connection ────────────────────────────────────────────────────
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

// ─── KV Memory — mutable state (SQLite local + 0G async backup) ─────────────
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

// ─── Log Memory — append-only history (SQLite local + 0G async backup) ──────
export class LogMemory {
  async append(event: RebalanceEvent): Promise<void> {
    try {
      const ev: any = event;
      const dec = ev.decision ?? {};
      const exec = ev.execution ?? {};
      const port = ev.portfolioState ?? {};

      // Map 6-state status to SQLite's 3-state
      const statusMap: Record<string, 'success' | 'failed' | 'skipped'> = {
        'executed': 'success',
        'stop-loss-executed': 'success',
        'failed': 'failed',
        'stop-loss-failed': 'failed',
        'skipped': 'skipped',
        'stop-loss': 'skipped',
      };

      // Derive ETH price from portfolio if present
      let ethPrice: number | undefined;
      const ethBal = port.balances?.find((b: any) => b.symbol === 'ETH');
      if (ethBal?.usdValue && ethBal?.amount) {
        const amt = parseFloat(ethers.formatEther(ethBal.amount));
        if (amt > 0) ethPrice = ethBal.usdValue / amt;
      }

      addRebalance({
        timestamp:    ev.timestamp ?? Date.now(),
        from_asset:   dec.tokenIn  ?? '',
        to_asset:     dec.tokenOut ?? '',
        from_amount:  Number(dec.amountIn  ?? 0),
        to_amount:    Number(ev.quote?.amountOut ?? 0),
        eth_price:    ethPrice ?? undefined,
        gas_cost_usd: exec.gasUsedUsd ?? exec.gasCostUsd ?? undefined,
        tx_hash:      exec.txHash ?? undefined,
        reasoning:    dec.reasoning ?? '',
        status:       statusMap[ev.status] ?? 'failed',
        trigger_type: dec.triggerType ?? undefined,
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

  async getHistory(limit = 20): Promise<RebalanceEvent[]> {
    const rows = getRebalances(limit);
    return rows.map(r => ({
      id: String(r.id),
      timestamp: r.timestamp,
      fromAsset: r.from_asset,
      toAsset: r.to_asset,
      fromAmount: r.from_amount,
      toAmount: r.to_amount,
      ethPrice: r.eth_price,
      reasoning: r.reasoning,
      status: r.status === 'success' ? 'executed' : r.status,
      triggerType: r.trigger_type,
      execution: r.tx_hash ? { txHash: r.tx_hash, gasUsedUsd: r.gas_cost_usd } : undefined,
    })) as unknown as RebalanceEvent[];
  }
}
