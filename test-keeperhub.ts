import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testKeeperHub() {
  console.log('\n── KeeperHub MCP Test ──────────────────\n');

  const url = process.env.KEEPERHUB_MCP_URL || 'https://app.keeperhub.com/mcp';
  const key = process.env.KEEPERHUB_API_KEY || '';

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/json, text/event-stream',
    'Mcp-Protocol-Version': '2024-11-05',
  };

  // Try different initialize payload formats
  const payloads = [
    // Format A — standard MCP
    { jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'voltaire-ai', version: '1.0.0' } }, id: 1 },
    // Format B — minimal
    { jsonrpc: '2.0', method: 'initialize', params: {}, id: 1 },
    // Format C — with method as tools/list directly
    { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 },
  ];

  for (let i = 0; i < payloads.length; i++) {
    console.log(`\nTrying format ${String.fromCharCode(65+i)}:`, JSON.stringify(payloads[i]));
    const res = await axios.post(url, payloads[i], {
      headers: baseHeaders,
      validateStatus: () => true
    });
    console.log(`Status: ${res.status}`);
    console.log(`Session ID header: ${res.headers['mcp-session-id'] || 'none'}`);
    console.log(`Body:`, JSON.stringify(res.data));
    if (res.status === 200 || res.headers['mcp-session-id']) {
      console.log('\n✓ This format worked!');
      break;
    }
  }

  console.log('\n── Done ──\n');
}

testKeeperHub().catch(console.error);