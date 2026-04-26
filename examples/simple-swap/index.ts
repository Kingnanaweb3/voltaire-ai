// ─── Voltaire AI SDK — Simple Swap Example ───────────────────────────────────
// Build a custom agent in under 50 lines using voltaire/core.
import dotenv from 'dotenv';
dotenv.config();
import { UniswapRouter, KeeperHubExecutor, ScheduledTrigger } from '../../sdk';

const router = new UniswapRouter();
const executor = new KeeperHubExecutor();

async function swapETHtoUSDC() {
  const walletAddress = process.env.AGENT_WALLET_ADDRESS!;
  const quote = await router.getQuote({ tokenIn: 'ETH', tokenOut: 'USDC', amountIn: '10000000000000000', walletAddress });
  console.log(`Quote: 0.01 ETH → ${quote.amountOut} USDC`);
  const tx = await router.buildSwap({ quote, walletAddress });
  const jobId = await executor.submit(tx);
  const result = await executor.waitForConfirmation(jobId);
  console.log(result.success ? `✓ Swapped — tx: ${result.txHash}` : `✗ Failed: ${result.error}`);
}

const trigger = new ScheduledTrigger('0 10 * * *');
trigger.start(swapETHtoUSDC);
console.log('Simple swap agent running...');
