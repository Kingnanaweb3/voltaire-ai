'use client';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rabbyWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

export const ogGalileo = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: 'ChainScan', url: 'https://chainscan-galileo.0g.ai' },
  },
  testnet: true,
});

const projectId = '4cc4d078523f3fd5081f99522a36f945';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [rainbowWallet, metaMaskWallet, rabbyWallet, walletConnectWallet],
    },
    {
      groupName: 'Other',
      wallets: [coinbaseWallet, injectedWallet],
    },
  ],
  {
    appName: 'Voltaire AI',
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [baseSepolia, ogGalileo],
  transports: {
    [baseSepolia.id]: http(),
    [ogGalileo.id]: http(),
  },
  ssr: true,
});
