'use client';
import { T } from '@/lib/tokens';
import { ConnectButton } from '@rainbow-me/rainbowkit';

type WalletMode = 'connected' | 'agent';

export function Header({
  activeNav,
  status,
  triggered,
  onTrigger,
  walletMode,
  setWalletMode,
  hasConnectedWallet,
}: {
  activeNav: string;
  status: any;
  triggered: boolean;
  onTrigger: () => void;
  walletMode: WalletMode;
  setWalletMode: (m: WalletMode) => void;
  hasConnectedWallet: boolean;
}) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}
      className="dashboard-header"
    >
      <div>
        <div style={{ fontSize: 11, fontFamily: T.mono, color: T.textSecondary, marginBottom: 4 }}>
          VOLTAIRE AI · AUTONOMOUS PORTFOLIO REBALANCER
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: T.textPrimary }}>
          {activeNav}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}
        >
          <button
            onClick={() => setWalletMode('agent')}
            style={{
              background: walletMode === 'agent' ? T.limeDim : 'transparent',
              color: walletMode === 'agent' ? T.lime : T.textSecondary,
              border: 'none',
              borderRadius: 7,
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: T.sans,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title="View the Voltaire-managed agent's portfolio"
          >
            🤖 Agent
          </button>
          <button
            onClick={() => hasConnectedWallet && setWalletMode('connected')}
            disabled={!hasConnectedWallet}
            style={{
              background: walletMode === 'connected' ? T.limeDim : 'transparent',
              color: walletMode === 'connected' ? T.lime : !hasConnectedWallet ? T.textSecondary + '60' : T.textSecondary,
              border: 'none',
              borderRadius: 7,
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: T.sans,
              fontWeight: 600,
              cursor: hasConnectedWallet ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              opacity: hasConnectedWallet ? 1 : 0.5,
            }}
            title={hasConnectedWallet ? 'View your connected wallet' : 'Connect a wallet first'}
          >
            🔗 Mine
          </button>
        </div>

        <ConnectButton
          accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
          chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
          showBalance={false}
        />

        <button
          onClick={onTrigger}
          style={{
            background: triggered ? T.limeDim : T.lime,
            color: triggered ? T.lime : '#0E1012',
            border: triggered ? `1px solid ${T.lime}` : 'none',
            borderRadius: 10,
            padding: '9px 18px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: T.sans,
            transition: 'all 0.2s ease',
            boxShadow: triggered ? `0 0 16px ${T.lime}40` : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {triggered ? '↻ Triggering...' : '⟳ Rebalance Now'}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-header {
            margin-top: 60px !important;
          }
        }
      `}</style>
    </header>
  );
}
