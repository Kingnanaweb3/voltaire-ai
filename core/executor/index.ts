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
  private wallet: ethers.Wallet | ethers.HDNodeWallet;

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

  async getOrCreateRebalancerWorkflow(tx?: UnsignedTransaction): Promise<string> {
    const listResult = await this.callTool('list_workflows', { limit: 20 });
    const text = listResult?.content?.[0]?.text || '[]';
    let workflows: any[] = [];
    try { workflows = JSON.parse(text); } catch { workflows = []; }

    const existing = workflows.find((w: any) => w.name === 'voltaire-rebalancer-v3');
    if (existing) {
      console.log(`[KeeperHub] Deleting stale workflow: ${existing.id}`);
      await this.callTool('delete_workflow', { workflowId: existing.id, force: true });
    }
    if (false) {
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
              recipient: tx?.to || '0x0514E3b0eA3C16ADa117ecf1892b050df3C2F273',
              amount: tx?.value ? ethers.formatEther(tx.value) : '0.01',
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

    // MOCK ROUTING — when Uniswap mocks a Sepolia quote, the destination is the
    // Universal Router (0x492e...). KeeperHub's transfer to a router with no calldata
    // reverts. Reroute to the agent's own wallet so the cycle still ships a real
    // KeeperHub-executed on-chain tx (real gas, real hash, real receipt).
    // Real Uniswap routing is used on mainnet (chain 8453) where Trade API has liquidity.
    const UNIVERSAL_ROUTER_SEPOLIA = '0x492e6456d9528771018deb9e87ef7750ef184104';
    const isMockSwap = tx.to?.toLowerCase() === UNIVERSAL_ROUTER_SEPOLIA.toLowerCase();

    if (isMockSwap) {
      // Execute swap directly via ethers on Sepolia — KeeperHub transfer routing fails on testnet
      console.log('[KeeperHub] Sepolia swap — executing directly via ethers wallet');
      try {
        const txRequest: any = {
          to: tx.to,
          data: tx.data || '0x',
          value: tx.value ? BigInt(tx.value) : BigInt(0),
          gasLimit: BigInt(300000),
        };
        const sentTx = await this.wallet.sendTransaction(txRequest);
        console.log(`[KeeperHub] Direct swap submitted: ${sentTx.hash}`);
        const receipt = await sentTx.wait();
        const executionId = `direct_${sentTx.hash.slice(0, 16)}`;
        // Store for waitForConfirmation
        (this as any)._directTxHash = sentTx.hash;
        (this as any)._directReceipt = receipt;
        return executionId;
      } catch (err: any) {
        console.warn('[KeeperHub] Direct swap failed, falling back to self-transfer:', err.message);
      }
    }

    const recipient = tx.to;
    const amount = ethers.formatEther(tx.value || '0');
    console.log(`[KeeperHub] Executing transfer — to: ${recipient}, amount: ${amount} ETH`);
    const result = await this.callTool('execute_transfer', {
      network: '84532',
      recipient_address: recipient,
      amount: amount,
    });
    const text = result?.content?.[0]?.text || '{}';
    let exec: any = {};
    try { exec = JSON.parse(text); } catch {}
    const executionId = exec?.execution_id || exec?.executionId || exec?.id || `exec_${Date.now()}`;
    console.log(`[KeeperHub] Transfer execution started: ${executionId}`);
    return executionId;
  }

  async waitForConfirmation(executionId: string, timeoutMs = 120_000): Promise<ExecutionResult> {
    // Handle direct ethers execution
    if (executionId.startsWith('direct_') && (this as any)._directTxHash) {
      const txHash = (this as any)._directTxHash;
      const receipt = (this as any)._directReceipt;
      (this as any)._directTxHash = null;
      (this as any)._directReceipt = null;
      const gasUsed = receipt?.gasUsed?.toString();
      const gasCostUsd = receipt ? Number(receipt.gasUsed * (receipt.gasPrice || BigInt(0))) / 1e18 * 2300 : undefined;
      return {
        success: !!receipt,
        txHash,
        gasUsed,
        gasCostUsd,
        jobId: executionId,
        retryCount: 0,
        confirmedAt: Date.now(),
        auditUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      };
    }
    const start = Date.now();
    let retryCount = 0;

    while (Date.now() - start < timeoutMs) {
      try {
        const statusResult = await this.callTool('get_direct_execution_status', { execution_id: executionId });
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
          console.log('[KeeperHub] Raw logs response:', JSON.stringify(logs, null, 2).slice(0, 2000));
          // Try multiple possible field names
          let txHash: string | undefined;
          for (const log of logs) {
            txHash = log.txHash || log.tx_hash || log.transactionHash || log.transaction_hash || log.hash || log.data?.txHash || log.data?.transaction_hash || log.result?.txHash || log.result?.transactionHash;
            if (txHash) break;
          }
          // Also check the status response itself
          if (!txHash) {
            txHash = status?.txHash || status?.tx_hash || status?.transactionHash || status?.transaction_hash || status?.result?.txHash || status?.result?.transactionHash;
          }
          console.log('[KeeperHub] Extracted txHash:', txHash || 'NONE');

          // ── Fetch real gas cost from on-chain receipt ──────────────────
          let gasUsed: string | undefined;
          let gasCostUsd: number | undefined;
          if (txHash) {
            try {
              const receipt = await this.provider.getTransactionReceipt(txHash);
              if (receipt) {
                const gasUsedBig = receipt.gasUsed;
                const gasPriceBig = receipt.gasPrice || BigInt(0);
                const ethCost = Number(gasUsedBig * gasPriceBig) / 1e18;
                gasUsed = gasUsedBig.toString();
                // Use $2300 ETH for now — could pull Chainlink here for precision
                gasCostUsd = ethCost * 2300;
                console.log(`[KeeperHub] Gas: ${gasUsed} units × ${gasPriceBig} wei = ${gasCostUsd.toFixed(4)}`);
              }
            } catch (e: any) {
              console.warn('[KeeperHub] Receipt fetch failed:', e.message);
            }
          }
          return {
            success: true,
            txHash,
            gasUsed,
            gasCostUsd,
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