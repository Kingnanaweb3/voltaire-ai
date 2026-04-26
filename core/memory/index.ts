// ─── Voltaire AI — Memory Module (0G Storage SDK) ───────────────────────────
// Uses @0gfoundation/0g-ts-sdk correctly per official docs.
// KV storage for state, MemData uploads for log history.

import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
import { RebalanceEvent, AgentConfig } from '../types';

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

// ─── KV Memory — mutable state via 0G KV ────────────────────────────────────
export class KVMemory implements IMemory {
  // In-memory cache for fast reads during a single agent run
  private cache: Map<string, any> = new Map();

  async get(key: string): Promise<any> {
    // Return from cache first
    if (this.cache.has(key)) return this.cache.get(key);

    // TODO: Replace with real 0G KV read when KvClient endpoint confirmed
    // const kvClient = new KvClient(process.env.OG_KV_URL);
    // const value = await kvClient.getValue(STREAM_ID, key);
    // For now returns null — wire real KV on Day 3
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    // Update local cache immediately
    this.cache.set(key, value);

    // Upload serialized value to 0G Storage as MemData
    try {
      const { indexer, signer, rpcUrl } = getConnection();
      const encoded = new TextEncoder().encode(JSON.stringify({ key, value, ts: Date.now() }));
      const memData = new MemData(encoded);
      const [, treeErr] = await memData.merkleTree();
      if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);
      const [, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
      if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);
    } catch (err) {
      // Log but don't throw — agent continues even if storage write fails
      console.warn(`[KVMemory] Storage write failed for key "${key}":`, err);
    }
  }

  // ── Convenience helpers ───────────────────────────────────────────────────
  async getConfig(): Promise<AgentConfig | null> { return this.get('agent:config'); }
  async setConfig(config: AgentConfig): Promise<void> { return this.set('agent:config', config); }
  async getLastRun(): Promise<number | null> { return this.get('agent:last_run'); }
  async setLastRun(timestamp: number): Promise<void> { return this.set('agent:last_run', timestamp); }
}

// ─── Log Memory — append-only history via 0G Storage ─────────────────────────
export class LogMemory {
  private localLog: RebalanceEvent[] = [];

  async append(event: RebalanceEvent): Promise<void> {
    // Keep in local log
    this.localLog.push(event);

    // Upload event to 0G Storage as immutable MemData entry
    try {
      const { indexer, signer, rpcUrl } = getConnection();
      const encoded = new TextEncoder().encode(JSON.stringify(event));
      const memData = new MemData(encoded);
      const [tree, treeErr] = await memData.merkleTree();
      if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

      console.log(`[LogMemory] Uploading event ${event.id} — root hash: ${tree?.rootHash()}`);

      const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
      if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

      console.log(`[LogMemory] Event stored on 0G — tx: ${JSON.stringify(tx)}`);
    } catch (err) {
      console.warn('[LogMemory] Storage write failed:', err);
    }
  }

  async getHistory(limit = 20): Promise<RebalanceEvent[]> {
    // Returns local in-memory log for now
    // TODO: Implement 0G Storage download by root hash index
    return this.localLog.slice(-limit);
  }
}