import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function deleteWorkflow() {
  const url = 'https://app.keeperhub.com/mcp';
  const key = process.env.KEEPERHUB_API_KEY || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/json, text/event-stream',
    'Mcp-Protocol-Version': '2024-11-05',
  };

  // Initialize session
  const initRes = await axios.post(url,
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'voltaire-ai', version: '1.0.0' } } },
    { headers, validateStatus: () => true }
  );
  const sessionId = initRes.headers['mcp-session-id'];
  if (!sessionId) { console.log('No session ID'); return; }
  headers['Mcp-Session-Id'] = sessionId;

  // List workflows
  const listRes = await axios.post(url,
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_workflows', arguments: { limit: 20 } } },
    { headers, validateStatus: () => true }
  );
  const text = listRes.data?.result?.content?.[0]?.text || '[]';
  const workflows = JSON.parse(text);
  console.log('Workflows:', workflows.map((w: any) => ({ id: w.id, name: w.name })));

  // Delete voltaire-rebalancer
  const target = workflows.find((w: any) => w.name === 'voltaire-rebalancer');
  if (!target) { console.log('Workflow not found'); return; }

  const delRes = await axios.post(url,
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'delete_workflow', arguments: { workflowId: target.id, force: true } } },
    { headers, validateStatus: () => true }
  );
  console.log('Delete result:', JSON.stringify(delRes.data?.result));
  console.log('Done — workflow deleted');
}

deleteWorkflow().catch(console.error);