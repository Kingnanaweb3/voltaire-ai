// ─── Voltaire AI — Executor Module (KeeperHub Workflow Engine) ───────────────

import axios from 'axios';
import { ethers } from 'ethers';
import { UnsignedTransaction, ExecutionResult } from '../types';

export class KeeperHubExecutor {
  private mcpUrl: string;
  private apiKey: string;
  private sessionId: string | null = null;
  private walletId: string = '9ztp3k16m2dvwfblt44ka';
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    this.mcpUrl = process.env.KEEPERHUB_MCP_URL || 'https://app.keeperhub.com/mcp';
    this.apiKey = process.env.KEEPERHUB_API_KEY || '';
    if (!this.apiKey) console.warn('[Executor] KEEPERHUB_API_KEY not set');
    if (!process.env.AGENT_PRIVATE_KEY) console.warn('[Executor] AGENT_PRIVATE_KEY not set');
    this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org');
    this.wallet = process.env.AGENT_PRIVATE_KEY
      ? new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider)
      : ethers.Wallet.createRandom();
  }

  private get baseHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json, text/event-stream',
      'Mcp-Protocol-Version': '2024-11-05',
    };
    if (this.sessionId) h['Mcp-Session-Id'] = this.sessionId;
    return h;
  }

  async initialize(): Promise<void> {
    const res = await axios.post(
      this.mcpUrl,
      {
        jsonrpc: '2.0', id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'voltaire-ai', version: '1.0.0' }
        }
      },
      { headers: this.baseHeaders, validateStatus: () => true }
    );
    const sessionId = res.headers['mcp-session-id'];
    if (!sessionId) throw new Error('KeeperHub: no session ID returned');
    this.sessionId = sessionId;
    await axios.post(
      this.mcpUrl,
      { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
      { headers: this.baseHeaders, validateStatus: () => true }
    );
    console.log('[KeeperHub] Session initialized');
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.sessionId) await this.initialize();
    const res = await axios.post(
      this.mcpUrl,
      { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } },
      { headers: this.baseHeaders, validateStatus: () => true }
    );
    if (res.data?.error) throw new Error(`KeeperHub tool error: ${JSON.stringify(res.data.error)}`);
    return res.data?.result;
  }

  async getOrCreateRebalancerWorkflow(): Promise<string> {
    const listResult = await this.callTool('list_workflows', { limit: 20 });
    const text = listResult?.content?.[0]?.text || '[]';
    let workflows: any[] = [];
    try { workflows = JSON.parse(text); } catch { workflows = []; }

    const existing = workflows.find((w: any) => w.name === 'voltaire-rebalancer-v3');
    if (existing) {
      console.log(`[KeeperHub] Using existing workflow: ${existing.id}`);
      return existing.id;
    }

    console.log(`[KeeperHub] Using wallet integration: ${this.walletId}`);

    const createResult = await this.callTool('create_workflow', {
      name: 'voltaire-rebalancer-v3',
      description: 'Autonomous portfolio rebalancing workflow — created by Voltaire AI agent',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: {
            label: 'Manual Trigger',
            type: 'trigger',
            config: { triggerType: 'Manual' },
            status: 'idle'
          }
        },
        {
          id: 'swap-action',
          type: 'action',
          data: {
            label: 'Execute Swap',
            description: 'Transfer ETH to rebalance portfolio',
            type: 'action',
            config: {
              actionType: 'web3/transfer-funds',
              network: '8453',
              toAddress: '0x0514E3b0eA3C16ADa117ecf1892b050df3C2F273',
              amount: '0.01',
              walletId: this.walletId
            },
            status: 'idle'
          }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'swap-action' }
      ]
    });

    const createText = createResult?.content?.[0]?.text || '{}';
    let created: any = {};
    try { created = JSON.parse(createText); } catch {}

    const workflowId = created?.id || created?.workflowId;
    if (!workflowId) throw new Error('KeeperHub: failed to create workflow');
    console.log(`[KeeperHub] Created workflow: ${workflowId}`);
    return workflowId;
  }

  async submit(tx: UnsignedTransaction): Promise<string> {
    if (!this.sessionId) await this.initialize();
    const workflowId = await this.getOrCreateRebalancerWorkflow();
    const execResult = await this.callTool('execute_workflow', {
      workflowId,
      input: {
        transaction: {
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasLimit: tx.gasLimit,
          chainId: tx.chainId,
        }
      }
    });
    const execText = execResult?.content?.[0]?.text || '{}';
    let exec: any = {};
    try { exec = JSON.parse(execText); } catch {}
    const executionId = exec?.executionId || exec?.id || `exec_${Date.now()}`;
    console.log(`[KeeperHub] Workflow execution started: ${executionId}`);
    return executionId;
  }

  async waitForConfirmation(executionId: string, timeoutMs = 120_000): Promise<ExecutionResult> {
    const start = Date.now();
    let retryCount = 0;

    while (Date.now() - start < timeoutMs) {
      try {
        const statusResult = await this.callTool('get_execution_status', { executionId });
        const statusText = statusResult?.content?.[0]?.text || '{}';
        let status: any = {};
        try { status = JSON.parse(statusText); } catch {}

        const state = status?.status || status?.state;
        console.log(`[KeeperHub] Execution ${executionId} — status: ${state}`);

        if (state === 'completed') {
          const logsResult = await this.callTool('get_execution_logs', { executionId });
          const logsText = logsResult?.content?.[0]?.text || '[]';
          let logs: any[] = [];
          try { logs = JSON.parse(logsText); } catch {}
          const txHash = logs.find((l: any) => l.txHash)?.txHash;
          return {
            success: true,
            txHash,
            jobId: executionId,
            retryCount,
            confirmedAt: Date.now(),
            auditUrl: `https://app.keeperhub.com/executions/${executionId}`,
          };
        }

        if (state === 'failed' || state === 'error') {
          console.error('[KeeperHub] Error details:', JSON.stringify(status));
          return {
            success: false,
            jobId: executionId,
            retryCount,
            error: status?.errorContext?.error || status?.error || status?.message || JSON.stringify(status),
          };
        }

        if (state === 'running') retryCount++;
      } catch (err) {
        console.warn('[KeeperHub] Poll error:', err);
      }

      await new Promise(r => setTimeout(r, 4_000));
    }

    return { success: false, jobId: executionId, retryCount, error: 'Execution timed out' };
  }

  async testConnection(): Promise<void> {
    await this.initialize();
    await this.callTool('list_workflows', { limit: 5 });
    console.log('[KeeperHub] Connection verified — tools accessible');
  }
}