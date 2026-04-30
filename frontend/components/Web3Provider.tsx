'use client';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/lib/wagmi-config';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

function RainbowKitWithTheme({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  const themeFn = mode === 'dark' ? darkTheme : lightTheme;
  return (
    <RainbowKitProvider
      theme={themeFn({
        accentColor: '#A3E635',
        accentColorForeground: '#0D0F12',
        borderRadius: 'medium',
        fontStack: 'system',
      })}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWithTheme>
            {children}
          </RainbowKitWithTheme>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
