// ─── Voltaire AI — Integration Tests ────────────────────────────────────────
// Run: npx ts-node test-integrations.ts
// Tests all 4 integrations individually before wiring together

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { ethers } from 'ethers';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(msg: string) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function fail(msg: string, err?: any) { console.log(`${RED}✗${RESET} ${msg}`); if (err) console.log(`  ${RED}${err?.message || err}${RESET}`); }
function info(msg: string) { console.log(`${YELLOW}→${RESET} ${msg}`); }
function header(msg: string) { console.log(`\n${BOLD}── ${msg} ──────────────────────────────${RESET}`); }

// ─── Test 1: Wallet + Base Sepolia RPC ───────────────────────────────────────
async function testWallet() {
  header('Test 1: Wallet + Base Sepolia RPC');
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
    const balance = await provider.getBalance(wallet.address);
    pass(`Connected to Base Sepolia`);
    pass(`Wallet address: ${wallet.address}`);
    info(`ETH balance: ${ethers.formatEther(balance)} ETH`);
    if (balance === 0n) {
      console.log(`  ${YELLOW}⚠ Balance is 0 — get testnet ETH from https://sepoliafaucet.com${RESET}`);
    }
  } catch (err: any) {
    fail('Wallet/RPC connection failed', err);
  }
}

// ─── Test 2: Uniswap API Quote ───────────────────────────────────────────────
async function testUniswap() {
  header('Test 2: Uniswap API');
  if (!process.env.UNISWAP_API_KEY || process.env.UNISWAP_API_KEY === 'your_uniswap_api_key_here') {
    fail('UNISWAP_API_KEY not set in .env');
    return;
  }
  try {
    const res = await axios.post(
      `${process.env.UNISWAP_API_URL}/quote`,
      {
        type: 'EXACT_INPUT',
        tokenIn: '0x4200000000000000000000000000000000000006',  // WETH Base Sepolia
        tokenOut: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
        tokenInChainId: 84532,
        tokenOutChainId: 84532,
        amount: '10000000000000000', // 0.01 ETH
        swapper: process.env.AGENT_WALLET_ADDRESS,
        slippageTolerance: '0.5',
      },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.UNISWAP_API_KEY } }
    );
    pass(`Uniswap API connected`);
    pass(`Quote received — routing: ${res.data.routing}`);
    info(`0.01 ETH → ~${(parseInt(res.data.quote?.output?.amount || '0') / 1e6).toFixed(2)} USDC`);
  } catch (err: any) {
    fail('Uniswap API call failed', err?.response?.data || err);
  }
}

// ─── Test 3: 0G Storage ──────────────────────────────────────────────────────
async function test0GStorage() {
  header('Test 3: 0G Storage');
  if (!process.env.AGENT_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY === 'your_wallet_private_key_here') {
    fail('AGENT_PRIVATE_KEY not set in .env');
    return;
  }
  try {
    const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL);
    const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
    const indexer = new Indexer(process.env.OG_INDEXER_URL!);

    const testData = new TextEncoder().encode(JSON.stringify({
      test: 'voltaire-ai',
      timestamp: Date.now(),
      message: 'Integration test from Voltaire AI'
    }));

    const memData = new MemData(testData);
    const [tree, treeErr] = await memData.merkleTree();
    if (treeErr) throw new Error(`Merkle tree: ${treeErr}`);

    pass(`0G Storage indexer connected`);
    pass(`Merkle tree generated — root: ${tree?.rootHash()?.slice(0, 20)}...`);
    info(`Uploading test data to 0G Storage...`);

    const [tx, uploadErr] = await indexer.upload(memData, process.env.OG_RPC_URL!, signer);
    if (uploadErr) throw new Error(`Upload: ${uploadErr}`);

    pass(`Data uploaded to 0G Storage!`);
    info(`TX: ${JSON.stringify(tx)}`);
  } catch (err: any) {
    fail('0G Storage test failed', err);
  }
}

// ─── Test 4: KeeperHub ───────────────────────────────────────────────────────
async function testKeeperHub() {
  header('Test 4: KeeperHub');
  if (!process.env.KEEPERHUB_API_KEY || process.env.KEEPERHUB_API_KEY === 'your_keeperhub_api_key_here') {
    fail('KEEPERHUB_API_KEY not set in .env');
    return;
  }
  try {
    const res = await axios.get(
      `${process.env.KEEPERHUB_MCP_URL}/health`,
      { headers: { 'Authorization': `Bearer ${process.env.KEEPERHUB_API_KEY}` } }
    );
    pass(`KeeperHub MCP connected`);
    info(`Status: ${JSON.stringify(res.data)}`);
  } catch (err: any) {
    // Try alternate endpoint if /health doesn't exist
    try {
      const res2 = await axios.get(
        `${process.env.KEEPERHUB_MCP_URL}/`,
        { headers: { 'Authorization': `Bearer ${process.env.KEEPERHUB_API_KEY}` } }
      );
      pass(`KeeperHub MCP reachable`);
      info(`Response: ${JSON.stringify(res2.data)}`);
    } catch (err2: any) {
      fail('KeeperHub connection failed', err?.response?.data || err);
      info('Check your KEEPERHUB_MCP_URL and KEEPERHUB_API_KEY in .env');
    }
  }
}

// ─── Run all tests ────────────────────────────────────────────────────────────
async function main() {
  console.log(`${BOLD}`);
  console.log('╔══════════════════════════════════════╗');
  console.log('║    VOLTAIRE AI — INTEGRATION TESTS   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`${RESET}`);

  await testWallet();
  await testUniswap();
  await test0GStorage();
  await testKeeperHub();

  console.log(`\n${BOLD}── Done ────────────────────────────────────────${RESET}\n`);
}

main().catch(console.error);
