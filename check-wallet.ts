import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
async function main() {
  const url = 'https://app.keeperhub.com/mcp';
  const key = process.env.KEEPERHUB_API_KEY!;
  const h: any = { 'Content-Type':'application/json','Authorization':`Bearer ${key}`,'Accept':'application/json, text/event-stream','Mcp-Protocol-Version':'2024-11-05' };
  const ir = await axios.post(url,{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'v',version:'1'}}},{headers:h,validateStatus:()=>true});
  h['Mcp-Session-Id'] = ir.headers['mcp-session-id'];
  const wr = await axios.post(url,{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'get_wallet_integration',arguments:{}}},{headers:h,validateStatus:()=>true});
  console.log('Wallet:', JSON.stringify(wr.data?.result, null, 2));
  const lr = await axios.post(url,{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_integrations',arguments:{}}},{headers:h,validateStatus:()=>true});
  console.log('Integrations:', JSON.stringify(lr.data?.result, null, 2));
}
main().catch(console.error);
