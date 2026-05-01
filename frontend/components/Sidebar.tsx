'use client';
import { useState } from 'react';
import { T } from '@/lib/tokens';

const NAV = [
  { icon: '⬡', label: 'Dashboard' },
  { icon: '◎', label: 'Portfolio' },
  { icon: '⟳', label: 'History' },
  { icon: '⚙', label: 'Config' },
  { icon: '▣', label: 'Agent Log' },
  { icon: '⬡', label: 'Swarm' },
];

export function Sidebar({ activeNav, setActiveNav, status }: {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  status: any;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, background: T.lime, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 15L9 3L15 15" stroke="#0E1012" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.5 10.5H12.5" stroke="#0E1012" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: T.textPrimary }}>Voltaire</span>
          <span style={{ fontSize: 9, background: T.limeDim, color: T.lime, padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 600 }}>AI</span>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV.map(({ icon, label }) => (
          <button key={label} onClick={() => { setActiveNav(label); setMobileOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
            fontFamily: T.sans, fontSize: 13, fontWeight: activeNav === label ? 600 : 400,
            background: activeNav === label ? T.limeDim : 'transparent',
            color: activeNav === label ? T.lime : T.textSecondary,
            borderLeft: `3px solid ${activeNav === label ? T.lime : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Agent status */}
      <div style={{ background: T.limeDim, border: `1px solid ${T.borderAccent}`, borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.lime, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.lime }}>AGENT ACTIVE</span>
        </div>
        <div style={{ fontSize: 10, color: T.textSecondary, fontFamily: T.mono }}>
          Base Sepolia · {status?.status || 'connecting...'}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        width: 220, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '24px 16px', gap: 16,
        flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }} className="desktop-sidebar">
        {navItems}
      </aside>

      {/* Mobile top bar */}
      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: T.bg, borderBottom: `1px solid ${T.border}`,
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: T.lime, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M3 15L9 3L15 15" stroke="#0E1012" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 10.5H12.5" stroke="#0E1012" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.textPrimary }}>Voltaire <span style={{ fontSize: 9, background: T.limeDim, color: T.lime, padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>AI</span></span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '6px 10px', color: T.textPrimary, cursor: 'pointer', fontSize: 16,
        }}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.6)',
        }} onClick={() => setMobileOpen(false)}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 260,
            background: T.bg, borderRight: `1px solid ${T.border}`,
            padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16,
          }} onClick={e => e.stopPropagation()}>
            {navItems}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
