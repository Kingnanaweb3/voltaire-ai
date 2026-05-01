/**
 * SwarmCoordinator — multi-agent shared state via 0G Storage.
 *
 * Lets agents publish signals and claims to a shared namespace.
 * Other agents in the swarm subscribe and react. State is immutable
 * and verifiable via 0G Storage txSeq.
 *
 * Built on KVMemory's 0G Storage backing — no extra infra required.
 */

import { KVMemory } from '../../../core/memory';

export interface SwarmSignal {
  id: string;
  topic: string;          // e.g. "market:eth_drop", "exec:claim_lock"
  agentId: string;        // who published it
  payload: any;
  timestamp: number;
  txSeq?: string;         // 0G Storage proof, set after backup
}

export interface SwarmAgentInfo {
  agentId: string;
  role: string;           // "rebalancer" | "dca" | "monitor" | custom
  walletAddress: string;
  registeredAt: number;
}

export class SwarmCoordinator {
  private memory: KVMemory;
  private agentId: string;
  private role: string;
  private walletAddress: string;

  constructor(opts: {
    memory: KVMemory;
    agentId: string;
    role: string;
    walletAddress: string;
  }) {
    this.memory = opts.memory;
    this.agentId = opts.agentId;
    this.role = opts.role;
    this.walletAddress = opts.walletAddress;
  }

  /** Register this agent in the swarm registry. Idempotent. */
  async register(): Promise<void> {
    const key = `swarm:agents:${this.agentId}`;
    const existing = await this.memory.get(key);
    if (existing) return;

    const info: SwarmAgentInfo = {
      agentId: this.agentId,
      role: this.role,
      walletAddress: this.walletAddress,
      registeredAt: Date.now(),
    };
    await this.memory.set(key, info);
  }

  /** Publish a signal to a topic. All swarm members can read it. */
  async publishSignal(topic: string, payload: any): Promise<SwarmSignal> {
    const signal: SwarmSignal = {
      id: `${this.agentId}:${Date.now()}`,
      topic,
      agentId: this.agentId,
      payload,
      timestamp: Date.now(),
    };

    // Append to topic log (last-N pattern, simple for hackathon)
    const logKey = `swarm:signals:${topic}`;
    const existing: SwarmSignal[] = (await this.memory.get(logKey)) || [];
    existing.push(signal);
    // Cap at 100 most recent per topic to keep reads cheap
    const trimmed = existing.slice(-100);
    await this.memory.set(logKey, trimmed);

    return signal;
  }

  /** Read all signals on a topic, optionally since a timestamp. */
  async readSignals(topic: string, sinceTs = 0): Promise<SwarmSignal[]> {
    const logKey = `swarm:signals:${topic}`;
    const signals: SwarmSignal[] = (await this.memory.get(logKey)) || [];
    return signals.filter(s => s.timestamp > sinceTs);
  }

  /**
   * Try to claim exclusive execution on a target (e.g. a rebalance).
   * Prevents two agents from acting on the same opportunity.
   * Returns true if claim succeeded, false if another agent claimed first.
   */
  async claimExecution(target: string, ttlMs = 60_000): Promise<boolean> {
    const key = `swarm:claims:${target}`;
    const existing = await this.memory.get(key);
    const now = Date.now();

    if (existing && existing.expiresAt > now) {
      return existing.agentId === this.agentId; // re-claim by same agent ok
    }

    await this.memory.set(key, {
      agentId: this.agentId,
      claimedAt: now,
      expiresAt: now + ttlMs,
    });
    return true;
  }

  /** List all registered agents in the swarm. */
  async listAgents(): Promise<SwarmAgentInfo[]> {
    // Simple: store registry in a single key. Real impl would scan prefix.
    const registry = (await this.memory.get('swarm:registry')) || [];
    return registry;
  }
}
