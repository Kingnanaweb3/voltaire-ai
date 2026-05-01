'use client';
import { useEffect, useRef, useState } from 'react';

const C = {
  bg900: '#0D0F12',
  bg800: '#15181E',
  bg700: '#1C2128',
  bg600: '#252B33',
  lime: '#A3E635',
  limeDark: '#84CC16',
  limeDim: 'rgba(163,230,53,0.08)',
  limeGlow: 'rgba(163,230,53,0.15)',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.1)',
  blue: '#60A5FA',
  blueDim: 'rgba(96,165,250,0.1)',
  purple: '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.1)',
  bone: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  border: 'rgba(255,255,255,0.05)',
  borderStrong: 'rgba(255,255,255,0.1)',
  borderLime: 'rgba(163,230,53,0.2)',
  lightBg: '#F3F4F6',
  lightCard: '#FFFFFF',
  lightText: '#111827',
  lightSub: '#4B5563',
  lightBorder: 'rgba(0,0,0,0.06)',
  jakarta: "'Plus Jakarta Sans', sans-serif",
  inter: "'Inter', sans-serif",
  satoshi: "'Satoshi', 'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', 'Menlo', monospace",
};

// ── Sticky Nav ──────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Why Voltaire', href: '#why-voltaire' },
    { label: 'Agent Flow', href: '#agent-flow' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 48px',
        background: scrolled ? 'rgba(13,15,18,0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.jakarta, fontWeight: 800, color: '#0D0F12', fontSize: 18 }}>V</div>
          <span style={{ fontFamily: C.jakarta, fontSize: 16, fontWeight: 700, color: C.bone, letterSpacing: '-0.01em' }}>Voltaire</span>
          <span style={{ fontFamily: C.satoshi, fontSize: 9, fontWeight: 700, color: C.lime, background: C.limeDim, border: `1px solid ${C.borderLime}`, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em' }}>AI</span>
        </a>

        {/* Center links — desktop */}
        <div className="nav-links" style={{ display: 'flex', gap: 36 }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="nav-link"
              style={{
                fontFamily: C.inter,
                fontSize: 14,
                fontWeight: 500,
                color: C.gray400,
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="/"
          className="btn-lime"
          style={{
            background: C.lime,
            color: '#0D0F12',
            fontFamily: C.satoshi,
            fontWeight: 700,
            fontSize: 13,
            padding: '9px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          Launch App
        </a>
      </div>

      <style>{`
        .nav-link:hover { color: ${C.bone} !important; }
        @media (max-width: 720px) {
          .nav-links { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

function Counter({ end, suffix = '', decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1400;
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(end * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref} style={{ fontFamily: C.satoshi, fontWeight: 700 }}>{val.toFixed(decimals)}{suffix}</span>;
}

function Hero() {
  return (
    <section id="top" style={{ background: C.bg900, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '130px 48px 80px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, background: `radial-gradient(ellipse at center, ${C.limeGlow} 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {Array.from({ length: 14 }).map((_, i) => <line key={`v${i}`} x1={`${(i + 1) * 7.14}%`} y1="0" x2={`${(i + 1) * 7.14}%`} y2="100%" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />)}
        {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />)}
      </svg>
      <div style={{ maxWidth: 860, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="fade-up" style={{ animationDelay: '0s', display: 'inline-flex', alignItems: 'center', gap: 8, background: C.bg700, border: `1px solid ${C.border}`, borderRadius: 100, padding: '5px 14px 5px 6px', marginBottom: 32 }}>
          <span style={{ background: C.lime, color: '#0D0F12', fontFamily: C.satoshi, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 100, letterSpacing: '0.05em' }}>LIVE</span>
          <span style={{ fontFamily: C.inter, fontSize: 12, color: C.gray400 }}>Now running on Base Sepolia · Audited on 0G Storage</span>
        </div>
        <h1 className="fade-up" style={{ animationDelay: '0.08s', fontFamily: C.jakarta, fontSize: 'clamp(44px, 6.5vw, 82px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', color: C.bone, marginBottom: 24 }}>
          Your portfolio.<br /><span style={{ color: C.lime }}>Rebalanced.</span> Automatically.
        </h1>
        <p className="fade-up" style={{ animationDelay: '0.16s', fontFamily: C.inter, fontSize: 17, fontWeight: 400, color: C.gray400, lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px' }}>
          Voltaire AI monitors your on-chain portfolio daily, calculates drift from your target ratio, and executes the minimum swap needed — powered by 0G, settled via Uniswap, guaranteed by KeeperHub.
        </p>
        <div className="fade-up" style={{ animationDelay: '0.22s', display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 60, flexWrap: 'wrap' }}>
          <a href="/" className="btn-lime" style={{ background: C.lime, color: '#0D0F12', fontFamily: C.satoshi, fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 10, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s ease' }}>Launch App</a>
          <a href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ background: 'transparent', color: C.bone, fontFamily: C.satoshi, fontWeight: 600, fontSize: 15, padding: '13px 28px', borderRadius: 10, border: `1px solid ${C.border}`, textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s ease' }}>See Open Source →</a>
        </div>
        <div className="fade-up" style={{ animationDelay: '0.3s', display: 'flex', gap: 0, borderTop: `1px solid ${C.border}`, paddingTop: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { n: 6, suf: '', label: '6-step agent loop', dec: 0 },
            { n: 4, suf: '', label: 'Live integrations', dec: 0 },
            { n: 100, suf: '%', label: 'On-chain audit trail', dec: 0 },
          ].map(({ n, suf, label, dec }, i) => (
            <div key={label} style={{ textAlign: 'center', padding: '0 48px', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 30, color: C.bone, lineHeight: 1 }}><Counter end={n} suffix={suf} decimals={dec} /></div>
              <div style={{ fontFamily: C.inter, fontSize: 12, color: C.gray500, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Set your target ratio', desc: 'Pick the allocation you want to hold — say 60% ETH, 40% USDC. Voltaire stores it as your portfolio policy.', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2 a10 10 0 0 1 0 20 z" fill="currentColor" stroke="none" /></svg> },
    { num: '02', title: 'Agent monitors drift', desc: 'Daily, the agent fetches your live on-chain balances, prices via Chainlink, and computes drift from target.', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 L8 12 L11 5 L13 19 L16 12 L21 12" /></svg> },
    { num: '03', title: 'Auto-rebalance executes', desc: 'When drift exceeds your threshold, Voltaire calculates the minimum swap, routes via Uniswap, and submits through KeeperHub.', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3 L21 3 L21 8" /><path d="M21 3 L13 11" /><path d="M8 21 L3 21 L3 16" /><path d="M3 21 L11 13" /></svg> },
  ];
  return (
    <section id="how-it-works" style={{ background: C.lightBg, padding: '120px 48px', position: 'relative', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', fontFamily: C.satoshi, fontSize: 11, fontWeight: 700, color: C.lightSub, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontFamily: C.jakarta, fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800, color: C.lightText, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 700, margin: '0 auto' }}>Three steps. Zero manual rebalancing.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="hiw-grid">
          {steps.map((s) => (
            <div key={s.num} style={{ background: C.lightCard, border: `1px solid ${C.lightBorder}`, borderRadius: 16, padding: '36px 28px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} className="hiw-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.limeDim, color: '#65A30D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                <div style={{ fontFamily: C.satoshi, fontSize: 14, fontWeight: 700, color: C.lightSub, letterSpacing: '0.05em' }}>{s.num}</div>
              </div>
              <h3 style={{ fontFamily: C.jakarta, fontSize: 20, fontWeight: 700, color: C.lightText, marginBottom: 10, letterSpacing: '-0.01em' }}>{s.title}</h3>
              <p style={{ fontFamily: C.inter, fontSize: 14, color: C.lightSub, lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .hiw-grid { grid-template-columns: 1fr !important; } }
        .hiw-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
      `}</style>
    </section>
  );
}

function DriftChart() {
  const ref = useRef<SVGSVGElement>(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const points = [
    { x: 0, y: 60 }, { x: 50, y: 62 }, { x: 100, y: 65 }, { x: 150, y: 68 },
    { x: 200, y: 72 }, { x: 250, y: 75 }, { x: 280, y: 60 }, { x: 330, y: 58 },
    { x: 380, y: 56 }, { x: 430, y: 60 }, { x: 480, y: 63 }, { x: 530, y: 60 },
  ];
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${100 - p.y * 1.1}`).join(' ');
  return (
    <svg ref={ref} viewBox="0 0 560 220" style={{ width: '100%', height: 'auto', maxWidth: 560 }}>
      {[40, 70, 100, 130, 160, 190].map(y => <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />)}
      <rect x="0" y="22" width="560" height="35" fill="rgba(245,158,11,0.06)" />
      <line x1="0" y1="23" x2="560" y2="23" stroke={C.amber} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <text x="8" y="18" fontFamily={C.mono} fontSize="9" fill={C.amber} opacity="0.8">UPPER THRESHOLD · 70%</text>
      <line x1="0" y1="56" x2="560" y2="56" stroke={C.lime} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <text x="8" y="52" fontFamily={C.mono} fontSize="9" fill={C.lime} opacity="0.8">TARGET · 60%</text>
      <line x1="0" y1="89" x2="560" y2="89" stroke={C.amber} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <text x="8" y="103" fontFamily={C.mono} fontSize="9" fill={C.amber} opacity="0.8">LOWER THRESHOLD · 50%</text>
      <path d={pathD} fill="none" stroke={C.lime} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 1200, strokeDashoffset: animated ? 0 : 1200, transition: 'stroke-dashoffset 2.5s ease-out' }} />
      {animated && (
        <g style={{ animation: 'fadeIn 0.4s ease 1.8s both' }}>
          <circle cx="265" cy={100 - 75 * 1.1} r="6" fill={C.amber} />
          <circle cx="265" cy={100 - 75 * 1.1} r="11" fill="none" stroke={C.amber} strokeWidth="2" opacity="0.4" />
          <text x="275" y="22" fontFamily={C.mono} fontSize="9" fill={C.amber} fontWeight="bold">⚡ REBALANCE TRIGGERED</text>
        </g>
      )}
    </svg>
  );
}

function WhyVoltaire() {
  const triggers = [
    { name: 'Drift threshold', color: C.lime, desc: 'Rebalance when allocation drifts X% from target', code: 'driftThreshold: 0.05' },
    { name: 'Stop-loss', color: C.amber, desc: 'Auto-convert to USDC when ETH drops below price floor', code: 'priceFloor: 2000' },
    { name: 'Price drop', color: C.purple, desc: 'Trigger when ETH drops X% in 24 hours', code: 'priceDropPercent: 10' },
    { name: 'Time-based', color: C.blue, desc: 'Run on a fixed schedule — daily, weekly, hourly', code: 'intervalHours: 24' },
  ];
  return (
    <section id="why-voltaire" style={{ background: C.bg900, padding: '120px 48px', position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ display: 'inline-block', fontFamily: C.satoshi, fontSize: 11, fontWeight: 700, color: C.lime, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Why Voltaire</div>
          <h2 style={{ fontFamily: C.jakarta, fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800, color: C.bone, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 760, margin: '0 auto' }}>Drift kills returns. <span style={{ color: C.lime }}>Voltaire keeps you on target.</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center', marginBottom: 100 }} className="why-grid">
          <div style={{ background: C.bg800, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gray500, marginBottom: 16, letterSpacing: '0.06em' }}>ETH ALLOCATION OVER TIME</div>
            <DriftChart />
          </div>
          <div>
            <h3 style={{ fontFamily: C.jakarta, fontSize: 28, fontWeight: 700, color: C.bone, marginBottom: 18, letterSpacing: '-0.02em', lineHeight: 1.2 }}>When ETH pumps, your portfolio quietly becomes 75% ETH.</h3>
            <p style={{ fontFamily: C.inter, fontSize: 15, color: C.gray400, lineHeight: 1.7, marginBottom: 16 }}>That's drift — your allocation drifting away from the target you actually wanted. Most traders ignore it until a crash wipes the unrealized gains.</p>
            <p style={{ fontFamily: C.inter, fontSize: 15, color: C.gray400, lineHeight: 1.7 }}>Voltaire watches drift continuously. The moment it crosses your threshold, the agent calculates the minimum swap to bring you back to target — and executes on-chain. No manual checks. No emotional decisions.</p>
          </div>
        </div>
        <div style={{ marginBottom: 100 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h3 style={{ fontFamily: C.jakarta, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: C.bone, letterSpacing: '-0.02em', marginBottom: 12 }}>Four trigger types. One protected portfolio.</h3>
            <p style={{ fontFamily: C.inter, fontSize: 15, color: C.gray400, maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>Stack triggers to define exactly when the agent should act — from drift correction to stop-loss protection.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="trig-grid">
            {triggers.map(t => (
              <div key={t.name} style={{ background: C.bg800, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, transition: 'border-color 0.2s ease' }} className="trig-card">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, marginBottom: 16, boxShadow: `0 0 16px ${t.color}80` }} />
                <div style={{ fontFamily: C.jakarta, fontSize: 16, fontWeight: 700, color: C.bone, marginBottom: 8 }}>{t.name}</div>
                <p style={{ fontFamily: C.inter, fontSize: 13, color: C.gray400, lineHeight: 1.55, marginBottom: 14, minHeight: 42 }}>{t.desc}</p>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: t.color, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>{t.code}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', fontFamily: C.satoshi, fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>For developers</div>
            <h3 style={{ fontFamily: C.jakarta, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: C.bone, letterSpacing: '-0.02em', marginBottom: 12 }}>Open source. <span style={{ color: C.lime }}>Built to be forked.</span></h3>
            <p style={{ fontFamily: C.inter, fontSize: 15, color: C.gray400, maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>Voltaire ships as a TypeScript SDK. Configure custom triggers, compose multiple agents, or build your own strategy on top of <code style={{ fontFamily: C.mono, fontSize: 13, color: C.lime }}>voltaire/core</code>.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="code-grid">
            <div style={{ background: C.bg800, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg700 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F56' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27C93F' }} />
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.gray500 }}>configure-trigger.ts</div>
              </div>
              <pre style={{ fontFamily: C.mono, fontSize: 12, color: C.bone, padding: 20, lineHeight: 1.7, margin: 0, overflow: 'auto' }}>
{`import { Agent } from 'voltaire/core';

const agent = new Agent({
  targetRatios: { ETH: 0.6, USDC: 0.4 },
  triggers: [
    { type: `}<span style={{ color: C.lime }}>{`'drift'`}</span>{`,    driftThreshold: 0.05 },
    { type: `}<span style={{ color: C.amber }}>{`'stop-loss'`}</span>{`, priceFloor: 2000 },
  ],
});

await agent.start();`}
              </pre>
            </div>
            <div style={{ background: C.bg800, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg700 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F56' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27C93F' }} />
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.gray500 }}>agent-swarm.ts</div>
              </div>
              <pre style={{ fontFamily: C.mono, fontSize: 12, color: C.bone, padding: 20, lineHeight: 1.7, margin: 0, overflow: 'auto' }}>
{`import { signalBus } from 'voltaire/core';

// Monitor agent emits signals
monitor.on(`}<span style={{ color: C.purple }}>{`'drift-detected'`}</span>{`, (sig) => {
  signalBus.emit(`}<span style={{ color: C.purple }}>{`'rebalance-needed'`}</span>{`, sig);
});

// Executor agent picks them up
executor.subscribe(`}<span style={{ color: C.purple }}>{`'rebalance-needed'`}</span>{`, swap);`}
              </pre>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.satoshi, fontSize: 14, fontWeight: 600, color: C.lime, textDecoration: 'none', borderBottom: `1px solid ${C.borderLime}`, paddingBottom: 4 }}>Read the SDK docs on GitHub →</a>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @media (max-width: 900px) {
          .why-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .trig-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .code-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) { .trig-grid { grid-template-columns: 1fr !important; } }
        .trig-card:hover { border-color: rgba(255,255,255,0.12) !important; }
      `}</style>
    </section>
  );
}

function AgentFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const steps = [
    { num: '01', title: 'Fetch', sub: 'Live balances + Chainlink price', icon: '⬇' },
    { num: '02', title: 'Decide', sub: 'Compute drift, check triggers', icon: '◆' },
    { num: '03', title: 'Quote', sub: 'Uniswap Trade API best-route', icon: '◎' },
    { num: '04', title: 'Build', sub: 'Construct swap transaction', icon: '⚙' },
    { num: '05', title: 'Execute', sub: 'KeeperHub guaranteed delivery', icon: '➤' },
    { num: '06', title: 'Log', sub: 'Audit trail to 0G Storage', icon: '✓' },
  ];
  return (
    <section ref={ref} id="agent-flow" style={{ background: C.lightBg, padding: '120px 48px', position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', fontFamily: C.satoshi, fontSize: 11, fontWeight: 700, color: C.lightSub, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>The agent loop</div>
          <h2 style={{ fontFamily: C.jakarta, fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800, color: C.lightText, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 760, margin: '0 auto 16px' }}>Six steps. <span style={{ color: '#65A30D' }}>One autonomous cycle.</span></h2>
          <p style={{ fontFamily: C.inter, fontSize: 15, color: C.lightSub, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>Every rebalance runs through this pipeline. Each step is logged on-chain, every decision is auditable.</p>
        </div>
        <div style={{ position: 'relative' }} className="flow-wrap">
          <div className="flow-line-bg" style={{ position: 'absolute', top: 38, left: '8%', right: '8%', height: 2, background: 'rgba(0,0,0,0.06)', zIndex: 0 }} />
          <div className="flow-line-fill" style={{ position: 'absolute', top: 38, left: '8%', height: 2, background: `linear-gradient(90deg, ${C.lime}, ${C.limeDark})`, zIndex: 1, width: active ? '84%' : 0, transition: 'width 3.5s ease-out' }} />
          {active && (
            <div style={{ position: 'absolute', top: 32, left: '8%', width: 14, height: 14, borderRadius: '50%', background: C.lime, boxShadow: `0 0 20px ${C.lime}, 0 0 8px ${C.lime}`, zIndex: 2, animation: 'pulseTravel 4s ease-in-out infinite' }} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, position: 'relative', zIndex: 3 }} className="flow-grid">
            {steps.map((s, i) => (
              <div key={s.num} style={{ textAlign: 'center', animation: active ? `flowStep 0.5s ease ${i * 0.18}s both` : 'none', opacity: active ? 1 : 0 }}>
                <div style={{ width: 76, height: 76, margin: '0 auto 18px', borderRadius: '50%', background: C.lightCard, border: `2px solid ${C.lime}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.satoshi, fontWeight: 700, color: '#65A30D', fontSize: 22, boxShadow: `0 4px 20px rgba(163,230,53,0.15)` }}>{s.icon}</div>
                <div style={{ fontFamily: C.satoshi, fontSize: 10, color: C.lightSub, letterSpacing: '0.08em', marginBottom: 4 }}>STEP {s.num}</div>
                <div style={{ fontFamily: C.jakarta, fontSize: 16, fontWeight: 700, color: C.lightText, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontFamily: C.inter, fontSize: 11, color: C.lightSub, lineHeight: 1.5, padding: '0 4px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 80, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {[
            { label: '0G Storage', color: '#A3E635' },
            { label: '0G Compute', color: '#A3E635' },
            { label: 'Uniswap v4', color: '#FF007A' },
            { label: 'KeeperHub', color: '#60A5FA' },
            { label: 'Chainlink', color: '#375BD2' },
            { label: 'Base Sepolia', color: '#0052FF' },
            { label: 'TypeScript', color: '#3178C6' },
            { label: 'ethers v6', color: '#627EEA' },
          ].map(({ label, color }) => (
            <span key={label} style={{ fontFamily: C.satoshi, fontSize: 12, fontWeight: 600, color: '#374151', background: C.lightCard, border: `1px solid ${C.lightBorder}`, borderRadius: 100, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes flowStep { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseTravel { 0% { left: 8%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 92%; opacity: 0; } }
        @media (max-width: 900px) {
          .flow-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 32px !important; }
          .flow-line-bg, .flow-line-fill { display: none !important; }
        }
        @media (max-width: 560px) { .flow-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ background: C.bg900, padding: '140px 48px 100px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: 500, height: 500, background: `radial-gradient(circle, ${C.limeGlow} 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, background: `radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.bg700, border: `1px solid ${C.borderLime}`, borderRadius: 100, padding: '6px 16px', marginBottom: 36 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.lime, animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: C.satoshi, fontSize: 11, fontWeight: 600, color: C.lime, letterSpacing: '0.06em' }}>OPEN BETA · BASE SEPOLIA</span>
        </div>
        <h2 style={{ fontFamily: C.jakarta, fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, color: C.bone, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 24 }}>
          Stop watching charts.<br /><span style={{ color: C.lime }}>Let the agent work.</span>
        </h2>
        <p style={{ fontFamily: C.inter, fontSize: 17, color: C.gray400, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 44px' }}>
          Connect your wallet, set your target, and let Voltaire handle the rest. Free during beta, fully open source, no contracts to sign.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 44, flexWrap: 'wrap' }}>
          <a href="/" className="btn-lime" style={{ background: C.lime, color: '#0D0F12', fontFamily: C.satoshi, fontWeight: 700, fontSize: 16, padding: '15px 36px', borderRadius: 12, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s ease', boxShadow: `0 4px 30px rgba(163,230,53,0.25)` }}>Launch App →</a>
          <a href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ background: 'transparent', color: C.bone, fontFamily: C.satoshi, fontWeight: 600, fontSize: 16, padding: '15px 32px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s ease' }}>See Open Source</a>
        </div>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', fontFamily: C.inter, fontSize: 13, color: C.gray500 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.lime }}>✓</span> No custody — your keys stay yours</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.lime }}>✓</span> 100% open source</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.lime }}>✓</span> On-chain audit trail</span>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: C.bg900, padding: '40px 48px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.jakarta, fontWeight: 800, color: '#0D0F12', fontSize: 18 }}>V</div>
          <div>
            <div style={{ fontFamily: C.jakarta, fontSize: 14, fontWeight: 700, color: C.bone, letterSpacing: '-0.01em' }}>Voltaire AI</div>
            <div style={{ fontFamily: C.inter, fontSize: 11, color: C.gray500, marginTop: 2 }}>Autonomous portfolio rebalancing on Base</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="https://x.com/AlmondWeb3" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.satoshi, fontSize: 13, fontWeight: 500, color: C.gray400, textDecoration: 'none', transition: 'color 0.15s ease' }} className="footer-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            @AlmondWeb3
          </a>
          <a href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.satoshi, fontSize: 13, fontWeight: 500, color: C.gray400, textDecoration: 'none', transition: 'color 0.15s ease' }} className="footer-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
            GitHub
          </a>
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.gray600 }}>© 2026</span>
        </div>
      </div>
      <style>{`.footer-link:hover { color: ${C.lime} !important; }`}</style>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg900}; }
        html { scroll-behavior: smooth; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .btn-lime:hover { transform: translateY(-1px); }
      `}</style>
      <Nav />
      <Hero />
      <HowItWorks />
      <WhyVoltaire />
      <AgentFlow />
      <CTA />
      <Footer />
    </>
  );
}
