'use client';
import { useEffect, useRef, useState } from 'react';

// ─── Design tokens — strictly from template ─────────────────────────────
const C = {
  bg900: '#0D0F12',
  bg800: '#15181E',
  bg700: '#1C2128',
  lime: '#A3E635',
  limeDark: '#84CC16',
  limeLight: '#BEF264',
  limeDim: 'rgba(163,230,53,0.08)',
  limeGlow: 'rgba(163,230,53,0.15)',
  bone: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  border: 'rgba(255,255,255,0.05)',
  borderLime: 'rgba(163,230,53,0.2)',
  // Light section colors
  lightBg: '#EDEEF0',
  lightCard: '#FFFFFF',
  lightText: '#111827',
  lightSub: '#4B5563',
  // Fonts
  jakarta: "'Plus Jakarta Sans', sans-serif",
  inter: "'Inter', sans-serif",
  satoshi: "'Satoshi', 'Plus Jakarta Sans', sans-serif",
};

// ─── Global styles ──────────────────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: ${C.jakarta}; background: ${C.bg900}; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes flowDash { from{stroke-dashoffset:300} to{stroke-dashoffset:0} }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes countUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn { from{transform:scale(0.95);opacity:0} to{transform:scale(1);opacity:1} }
  .fade-up { animation: fadeUp 0.6s ease both; }
  .scale-in { animation: scaleIn 0.5s ease both; }

  /* Nav links */
  .nl { color:${C.gray400}; font-family:${C.inter}; font-size:14px; font-weight:400; cursor:pointer; transition:color 0.2s; text-decoration:none; }
  .nl:hover { color:${C.bone}; }

  /* Cards */
  .dark-card { background:${C.bg700}; border:1px solid ${C.border}; border-radius:16px; transition:border-color 0.2s; }
  .dark-card:hover { border-color:${C.borderLime}; }
  .light-card { background:${C.lightCard}; border:1px solid rgba(0,0,0,0.06); border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }

  /* Buttons */
  .btn-lime { background:${C.lime}; color:#0D0F12; border:none; border-radius:100px; padding:12px 28px; font-family:${C.jakarta}; font-weight:500; font-size:14px; letter-spacing:-0.01em; cursor:pointer; transition:all 0.2s; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
  .btn-lime:hover { background:${C.limeLight}; transform:translateY(-1px); box-shadow:0 8px 24px rgba(163,230,53,0.25); }
  .btn-ghost-dark { background:transparent; color:${C.bone}; border:1px solid ${C.border}; border-radius:100px; padding:11px 24px; font-family:${C.jakarta}; font-weight:500; font-size:14px; cursor:pointer; transition:all 0.2s; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
  .btn-ghost-dark:hover { border-color:${C.lime}; color:${C.lime}; }

  /* Chips */
  .chip { display:inline-flex; align-items:center; gap:6px; background:${C.bg700}; border:1px solid ${C.border}; border-radius:100px; padding:6px 14px; font-family:${C.satoshi}; font-size:12px; font-weight:500; color:${C.gray400}; letter-spacing:0.02em; cursor:pointer; transition:all 0.2s; text-decoration:none; }
  .chip:hover { border-color:${C.lime}; color:${C.lime}; }

  /* Section labels */
  .section-label { font-family:${C.satoshi}; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:${C.lime}; }
  .section-label-light { font-family:${C.satoshi}; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:${C.limeDark}; }

  /* Eyebrow chip */
  .eyebrow { display:inline-flex; align-items:center; gap:8px; background:${C.limeDim}; border:1px solid ${C.borderLime}; border-radius:100px; padding:6px 14px; font-family:${C.satoshi}; font-size:11px; font-weight:500; color:${C.lime}; letter-spacing:0.05em; }

  /* Stat strip */
  .stat-cell { font-family:${C.jakarta}; }
  .stat-num { font-size:28px; font-weight:700; color:${C.bone}; letter-spacing:-0.02em; line-height:1; }
  .stat-label { font-family:${C.inter}; font-size:12px; color:${C.gray400}; margin-top:6px; }

  /* Responsive */
  @media (max-width: 768px) {
    .nav-links { display: none !important; }
    .hero-cta-row { flex-direction: column !important; width: 100%; }
    .hero-cta-row > * { width: 100% !important; justify-content: center; }
    .hero-stat-strip { grid-template-columns: repeat(2, 1fr) !important; }
    .hero-tracks-row { flex-direction: column !important; align-items: stretch !important; }
    .section-pad { padding: 80px 24px !important; }
  }
`;

// ─── Fonts loader (Next.js-safe) ────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-voltaire-fonts]')) return;
    const f1 = document.createElement('link');
    f1.rel = 'stylesheet';
    f1.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap';
    f1.setAttribute('data-voltaire-fonts', 'true');
    document.head.appendChild(f1);

    const f2 = document.createElement('link');
    f2.rel = 'stylesheet';
    f2.href = 'https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap';
    f2.setAttribute('data-voltaire-fonts', 'true');
    document.head.appendChild(f2);
  }, []);
}

// ─── NAV ────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '20px 48px',
      background: `${C.bg900}cc`,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.jakarta, fontWeight: 700, fontSize: 18, color: C.bone, textDecoration: 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.lime, color: '#0D0F12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>A</div>
        Voltaire
        <span style={{ fontSize: 10, padding: '2px 6px', background: C.limeDim, color: C.lime, borderRadius: 4, fontFamily: 'monospace', fontWeight: 500 }}>AI</span>
      </a>
      <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <a className="nl" href="#how-it-works">How it works</a>
        <a className="nl" href="#swarm">Swarm</a>
        <a className="nl" href="#voltaire-ai">Voltaire AI</a>
        <a className="nl" href="#substrate">Substrate</a>
        <a className="nl" href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
      <a className="btn-lime" href="/app" style={{ padding: '10px 20px', fontSize: 13 }}>Open App →</a>
    </nav>
  );
}

// ─── SECTION 1: HERO ────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="top" className="section-pad" style={{
      background: C.bg900, minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '160px 48px 100px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.limeGlow} 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(80px)',
      }} />

      <div style={{ maxWidth: 1100, width: '100%', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        {/* Eyebrow */}
        <div className="fade-up eyebrow" style={{ animationDelay: '0.04s', marginBottom: 28 }}>
          VoltaireKit v0.1 · Open Source
        </div>

        {/* Headline */}
        <h1 className="fade-up" style={{
          animationDelay: '0.08s',
          fontFamily: C.jakarta,
          fontSize: 'clamp(36px, 5.5vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          color: C.bone,
          marginBottom: 28,
          maxWidth: 1200, margin: '0 auto 28px',
        }}>
          <span style={{ color: C.lime }}>VoltaireKit</span>, First<br />Autonomous DeFi Agents Framework
        </h1>

        {/* Subheadline */}
        <p className="fade-up" style={{
          animationDelay: '0.16s',
          fontFamily: C.inter,
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: C.gray400, lineHeight: 1.6,
          maxWidth: 720, margin: '0 auto 40px',
        }}>
          Build production DeFi agents in an afternoon. Memory, reasoning, execution, and swarm coordination — as importable primitives. Powered by <span style={{ color: C.lime, fontWeight: 600 }}>0G</span>.
        </p>

        {/* CTA row */}
        <div className="fade-up hero-cta-row" style={{
          animationDelay: '0.24s',
          display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
          marginBottom: 36,
        }}>
          <a className="btn-lime" href="#swarm">▶ Try the swarm demo</a>
          <a className="btn-ghost-dark" href="/swarm" target="_blank" rel="noopener noreferrer">Open live dashboard ↗</a>
        </div>

        {/* Tertiary GitHub link */}
        <div className="fade-up" style={{ animationDelay: '0.30s', marginBottom: 56 }}>
          <a className="nl" href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
            View on GitHub →
          </a>
        </div>

        {/* Stat strip */}
        <div className="fade-up hero-stat-strip" style={{
          animationDelay: '0.38s',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24, maxWidth: 720, margin: '0 auto',
          padding: '24px 16px',
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div className="stat-cell">
            <div className="stat-num">3</div>
            <div className="stat-label">agents in swarm</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">60+</div>
            <div className="stat-label">0G txSeqs verified</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">Base</div>
            <div className="stat-label">live on testnet</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">MIT</div>
            <div className="stat-label">license</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION 2: HOW IT WORKS ────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Import the primitives',
      code: "import { Brain, AgentMemory,\n         KeeperHubExecutor,\n         UniswapRouter } from '@voltaire/kit'",
      desc: 'One line gives you memory, reasoning, execution, routing.',
      isCode: true,
    },
    {
      n: '02',
      title: 'Write your strategy',
      copy: 'Brain decides. Memory persists to SQLite + 0G Storage. Executor signs and submits with audit URLs.',
      desc: '~50 lines of code for a full agent.',
      isCode: false,
    },
    {
      n: '03',
      title: 'Ship + coordinate',
      copy: 'Drop a SwarmCoordinator in and your agents share state via 0G. Three agents, one wallet, zero collisions.',
      desc: 'No central server. No message broker. Just verifiable shared memory.',
      isCode: false,
    },
  ];

  return (
    <section id="how-it-works" className="section-pad" style={{
      background: C.lightBg,
      padding: '120px 48px',
      scrollMarginTop: 80,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="section-label-light" style={{ marginBottom: 14 }}>How it works</div>
          <h2 style={{
            fontFamily: C.jakarta,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 800,
            color: C.lightText,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            maxWidth: 700,
            margin: '0 auto',
          }}>
            Three steps. <span style={{ color: C.limeDark }}>Zero plumbing.</span>
          </h2>
        </div>

        <div className="hiw-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }}>
          {steps.map((step) => (
            <div key={step.n} className="hiw-card" style={{
              background: C.lightCard,
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 16,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.25s ease',
              cursor: 'default',
            }}>
              <div style={{
                fontFamily: C.satoshi,
                fontSize: 13,
                fontWeight: 600,
                color: C.lightSub,
                letterSpacing: '0.08em',
                marginBottom: 20,
              }}>
                {step.n}
              </div>

              <h3 className="hiw-title" style={{
                fontFamily: C.jakarta,
                fontSize: 22,
                fontWeight: 700,
                color: C.lightText,
                marginBottom: 18,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}>
                {step.title}
              </h3>

              {step.isCode ? (
                <pre style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: C.lightText,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 14,
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                  lineHeight: 1.6,
                }}>{step.code}</pre>
              ) : (
                <p style={{
                  fontFamily: C.inter,
                  fontSize: 15,
                  color: C.lightText,
                  lineHeight: 1.55,
                  marginBottom: 14,
                }}>
                  {step.copy}
                </p>
              )}

              <p style={{
                fontFamily: C.inter,
                fontSize: 13,
                color: C.lightSub,
                lineHeight: 1.55,
                marginTop: 'auto',
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hiw-card:hover {
          transform: translateY(-4px);
          border-color: ${C.limeDark} !important;
          box-shadow: 0 12px 32px rgba(132,204,22,0.18) !important;
        }
        .hiw-card:hover .hiw-title {
          color: ${C.limeDark} !important;
        }
        @media (max-width: 900px) {
          .hiw-grid {
            grid-template-columns: 1fr !important;
          }
        }
      ` }} />
    </section>
  );
}

// ─── SECTION 3: THE SWARM ──────────────────────────────────────────────
function SwarmSection() {
  return (
    <section id="swarm" className="section-pad" style={{
      background: C.bg800,
      padding: '120px 48px',
      scrollMarginTop: 80,
      borderTop: `1px solid ${C.border}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* subtle backdrop */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 800, height: 400, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.limeGlow} 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(80px)',
        opacity: 0.5,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-label" style={{ marginBottom: 14 }}>Swarm coordination</div>
          <h2 style={{
            fontFamily: C.jakarta,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 800,
            color: C.bone,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            maxWidth: 800,
            margin: '0 auto 18px',
          }}>
            Three agents. One wallet. <span style={{ color: C.lime }}>Zero collisions.</span>
          </h2>
          <p style={{
            fontFamily: C.inter,
            fontSize: 'clamp(15px, 1.6vw, 17px)',
            color: C.gray400,
            lineHeight: 1.6,
            maxWidth: 660,
            margin: '0 auto',
          }}>
            Coordinated via 0G Storage. No central server. No message broker. Just verifiable shared memory.
          </p>
        </div>

        {/* Animated SVG Flow */}
        <div style={{
          background: C.bg700,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '48px 32px',
          marginBottom: 32,
        }}>
          <svg viewBox="0 0 900 280" style={{ width: '100%', height: 'auto', display: 'block' }} className="swarm-svg">
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.lime} stopOpacity="0" />
                <stop offset="50%" stopColor={C.lime} stopOpacity="1" />
                <stop offset="100%" stopColor={C.lime} stopOpacity="0" />
              </linearGradient>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connector line: monitor → rebalancer */}
            <line x1="180" y1="140" x2="420" y2="140" stroke={C.border} strokeWidth="2" />
            <line x1="180" y1="140" x2="420" y2="140" stroke={C.lime} strokeWidth="2" strokeDasharray="6 6" style={{ animation: 'flowDash 1.5s linear infinite' }} />
            {/* Topic chip 1 */}
            <rect x="240" y="115" width="140" height="22" rx="11" fill={C.bg800} stroke={C.borderLime} strokeWidth="1" />
            <text x="310" y="130" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill={C.lime} textAnchor="middle">market:eth_drop</text>

            {/* Connector line: rebalancer → dca */}
            <line x1="540" y1="140" x2="780" y2="140" stroke={C.border} strokeWidth="2" />
            <line x1="540" y1="140" x2="780" y2="140" stroke={C.lime} strokeWidth="2" strokeDasharray="6 6" style={{ animation: 'flowDash 1.5s linear infinite', animationDelay: '0.5s' }} />
            {/* Topic chip 2 */}
            <rect x="600" y="115" width="120" height="22" rx="11" fill={C.bg800} stroke={C.borderLime} strokeWidth="1" />
            <text x="660" y="130" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill={C.lime} textAnchor="middle">claim_lock</text>

            {/* Node 1: Monitor */}
            <g filter="url(#nodeGlow)">
              <circle cx="100" cy="140" r="55" fill={C.bg700} stroke={C.lime} strokeWidth="2" style={{ animation: 'pulse 2.4s ease-in-out infinite' }} />
              <text x="100" y="135" fontSize="28" textAnchor="middle">👁</text>
              <text x="100" y="165" fontFamily={C.jakarta} fontSize="13" fontWeight="700" fill={C.bone} textAnchor="middle">Monitor</text>
            </g>

            {/* Node 2: Rebalancer */}
            <g filter="url(#nodeGlow)">
              <circle cx="480" cy="140" r="55" fill={C.bg700} stroke={C.lime} strokeWidth="2" style={{ animation: 'pulse 2.4s ease-in-out infinite', animationDelay: '0.6s' }} />
              <text x="480" y="135" fontSize="28" textAnchor="middle">⚖</text>
              <text x="480" y="165" fontFamily={C.jakarta} fontSize="13" fontWeight="700" fill={C.bone} textAnchor="middle">Rebalancer</text>
            </g>

            {/* Node 3: DCA */}
            <g filter="url(#nodeGlow)">
              <circle cx="800" cy="140" r="55" fill={C.bg700} stroke={C.lime} strokeWidth="2" style={{ animation: 'pulse 2.4s ease-in-out infinite', animationDelay: '1.2s' }} />
              <text x="800" y="135" fontSize="28" textAnchor="middle">◎</text>
              <text x="800" y="165" fontFamily={C.jakarta} fontSize="13" fontWeight="700" fill={C.bone} textAnchor="middle">DCA Agent</text>
            </g>

            {/* Bottom label */}
            <text x="450" y="240" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill={C.gray500} textAnchor="middle">— signals flow through 0G Storage —</text>
          </svg>
        </div>

        {/* 3 caption lines below */}
        <div className="swarm-captions" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { agent: 'Monitor', action: 'publishes signal → 0G Storage write' },
            { agent: 'Rebalancer', action: 'reads → claims execution' },
            { agent: 'DCA', action: 'sees claim taken → falls back gracefully' },
          ].map((c, i) => (
            <div key={i} className="caption-row" style={{
              padding: '14px 18px',
              background: C.bg700,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              fontFamily: C.inter,
              fontSize: 13,
              color: C.gray400,
              lineHeight: 1.5,
              animationDelay: `${0.2 + i * 0.15}s`,
            }}>
              <span style={{ color: C.lime, fontWeight: 600 }}>{c.agent}</span>
              <span style={{ marginLeft: 6 }}>{c.action}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <a className="btn-lime" href="/swarm" target="_blank" rel="noopener noreferrer">
            See it live on /swarm ↗
          </a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .caption-row {
          animation: fadeUp 0.5s ease both;
        }
        @media (max-width: 768px) {
          .swarm-captions {
            grid-template-columns: 1fr !important;
          }
        }
      ` }} />
    </section>
  );
}

// ─── HOOK: useInView ──────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── COMPONENT: Counter (animated count-up) ──────────────────────────
function Counter({ to, suffix = '', prefix = '', duration = 1500, active = true, format }: {
  to: number; suffix?: string; prefix?: string; duration?: number; active?: boolean;
  format?: (n: number) => string;
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(eased * to);
      if (progress < 1) requestAnimationFrame(tick);
      else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [to, duration, active]);
  const display = format ? format(val) : Math.floor(val).toString();
  return <span>{prefix}{display}{suffix}</span>;
}

// ─── COMPONENT: RadialGauge ──────────────────────────────────────────
function RadialGauge({ value = 96, label = '', active = true }: { value?: number; label?: string; active?: boolean }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const duration = 1800;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased * value);
      if (p < 1) requestAnimationFrame(tick);
      else setProgress(value);
    };
    requestAnimationFrame(tick);
  }, [value, active]);

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="14" />
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke={C.limeDark}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
        <text x="100" y="100" textAnchor="middle" fontFamily={C.jakarta} fontSize="38" fontWeight="800" fill={C.lightText} dy="0.1em">
          {Math.floor(progress)}%
        </text>
        <text x="100" y="125" textAnchor="middle" fontFamily={C.inter} fontSize="11" fill={C.lightSub}>
          adherence
        </text>
      </svg>
      <div style={{
        fontFamily: C.satoshi,
        fontSize: 12,
        fontWeight: 500,
        color: C.lightSub,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── SECTION 4: VOLTAIRE AI IN ACTION ─────────────────────────────────
function VoltaireAISection() {
  const { ref, inView } = useInView(0.2);

  const tiles = [
    { num: 60, suffix: '+', label: '0G Storage uploads on Galileo testnet' },
    { num: 100, suffix: '%', label: 'actions with KeeperHub audit URLs' },
    { num: 1, prefix: '< ', suffix: 's', label: 'brain decision latency' },
    { num: 0, suffix: '', label: 'collisions across 3-agent swarm' },
  ];

  return (
    <section id="voltaire-ai" ref={ref} className="section-pad" style={{
      background: C.lightBg,
      padding: '120px 48px',
      scrollMarginTop: 80,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 56,
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <div className="section-label-light" style={{ marginBottom: 14 }}>Voltaire AI · the first agent on the kit</div>
          <h2 style={{
            fontFamily: C.jakarta,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 800,
            color: C.lightText,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 18,
          }}>
            Production-shaped. <span style={{ color: C.limeDark }}>Verifiably real.</span>
          </h2>
          <p style={{
            fontFamily: C.inter,
            fontSize: 'clamp(15px, 1.6vw, 17px)',
            color: C.lightSub,
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Voltaire AI is an autonomous ETH/USDC rebalancer on Base Sepolia. It imports every primitive from <span style={{ fontFamily: 'monospace', color: C.limeDark, fontWeight: 600 }}>@voltaire/kit</span>. Every action signed, every memory write proven on 0G.
          </p>
        </div>

        {/* 4 stat tiles */}
        <div className="vai-tiles" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 48,
        }}>
          {tiles.map((t, i) => (
            <div key={i} style={{
              background: C.lightCard,
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
            }}>
              <div style={{
                fontFamily: C.jakarta,
                fontSize: 'clamp(28px, 3.5vw, 38px)',
                fontWeight: 800,
                color: C.lightText,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginBottom: 8,
              }}>
                <Counter to={t.num} prefix={t.prefix} suffix={t.suffix} active={inView} />
              </div>
              <div style={{
                fontFamily: C.inter,
                fontSize: 13,
                color: C.lightSub,
                lineHeight: 1.4,
              }}>
                {t.label}
              </div>
            </div>
          ))}
        </div>

        {/* Radial gauge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 32,
          opacity: inView ? 1 : 0,
          transform: inView ? 'scale(1)' : 'scale(0.92)',
          transition: 'opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s',
        }}>
          <div style={{
            background: C.lightCard,
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 16,
            padding: '36px 48px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <RadialGauge value={96} label="Target ratio adherence" active={inView} />
          </div>
        </div>

        {/* Bottom link */}
        <div style={{
          textAlign: 'center',
          opacity: inView ? 1 : 0,
          transition: 'opacity 0.5s ease 0.9s',
        }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: C.inter,
            fontSize: 14,
            color: C.limeDark,
            textDecoration: 'none',
            borderBottom: `1px solid ${C.limeDark}`,
            paddingBottom: 2,
          }}>
            View live activity on the dashboard →
          </a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .vai-tiles { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .vai-tiles { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </section>
  );
}

// ─── SECTION 5: THE SUBSTRATE ──────────────────────────────────────────
function SubstrateSection() {
  const { ref, inView } = useInView(0.2);

  const cards = [
    {
      name: '0G',
      url: 'https://github.com/Kingnanaweb3/voltaire-ai/tree/main/core/memory',
      desc: 'Storage for signal persistence. Compute for LLM reasoning. Chain for ERC-7857 agent NFTs.',
      file: 'core/memory',
    },
    {
      name: 'KeeperHub',
      url: 'https://github.com/Kingnanaweb3/voltaire-ai/tree/main/core/executor',
      desc: 'MCP server for verifiable execution. Every swap returns an audit URL with full trace.',
      file: 'core/executor',
    },
    {
      name: 'Uniswap',
      url: 'https://github.com/Kingnanaweb3/voltaire-ai/tree/main/core/router',
      desc: 'Trade API for quotes and swap routing. Production-grade liquidity for the rebalancer.',
      file: 'core/router',
    },
  ];

  return (
    <section id="substrate" ref={ref} className="section-pad" style={{
      background: C.bg900,
      padding: '120px 48px',
      scrollMarginTop: 80,
      borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 56,
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <div className="section-label" style={{ marginBottom: 14 }}>The substrate</div>
          <h2 style={{
            fontFamily: C.jakarta,
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 800,
            color: C.bone,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            maxWidth: 760,
            margin: '0 auto',
          }}>
            Built on the <span style={{ color: C.lime }}>layers that matter.</span>
          </h2>
        </div>

        {/* 3 cards */}
        <div className="substrate-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}>
          {cards.map((c, i) => (
            <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer" className="substrate-card" style={{
              background: C.bg700,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 28,
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.25s ease',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(30px)',
              transitionDelay: `${i * 0.1}s`,
              cursor: 'pointer',
            }}>
              {/* Partner name */}
              <div style={{
                fontFamily: C.jakarta,
                fontSize: 28,
                fontWeight: 800,
                color: C.bone,
                letterSpacing: '-0.02em',
                marginBottom: 18,
              }}>
                {c.name}
              </div>

              {/* Description */}
              <p style={{
                fontFamily: C.inter,
                fontSize: 15,
                color: C.gray400,
                lineHeight: 1.6,
                marginBottom: 24,
                flex: 1,
              }}>
                {c.desc}
              </p>

              {/* Footer: file path */}
              <div style={{
                paddingTop: 20,
                borderTop: `1px solid ${C.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: C.gray500,
              }}>
                <span>{c.file}</span>
                <span className="substrate-arrow" style={{ transition: 'transform 0.2s' }}>→</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .substrate-card {
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .substrate-card:hover {
          border-color: ${C.lime} !important;
          box-shadow: 0 12px 32px rgba(163,230,53,0.12);
        }
        .substrate-card:hover .substrate-arrow {
          transform: translateX(4px);
          color: ${C.lime};
        }
        @media (max-width: 900px) {
          .substrate-grid {
            grid-template-columns: 1fr !important;
          }
        }
      ` }} />
    </section>
  );
}

// ─── SECTION 6: CTA ────────────────────────────────────────────────────
function CTASection() {
  const { ref, inView } = useInView(0.2);

  const tracks = [
    { label: '0G — Framework', url: 'https://github.com/Kingnanaweb3/voltaire-ai/tree/main/packages/voltaire-kit' },
    { label: '0G — Autonomous Agents', url: 'https://github.com/Kingnanaweb3/voltaire-ai/tree/main/agents/rebalancer' },
    { label: 'KeeperHub — Verifiable Execution', url: 'https://github.com/Kingnanaweb3/voltaire-ai/blob/main/FEEDBACK_KEEPERHUB.md' },
    { label: 'Uniswap — Trade API', url: 'https://github.com/Kingnanaweb3/voltaire-ai/blob/main/FEEDBACK.md' },
  ];

  return (
    <section id="cta" ref={ref} className="section-pad" style={{
      background: C.bg900,
      padding: '140px 48px 120px',
      scrollMarginTop: 80,
      borderTop: `1px solid ${C.border}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Strong lime glow orb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 900,
        height: 900,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.limeGlow} 0%, transparent 60%)`,
        pointerEvents: 'none',
        filter: 'blur(80px)',
        opacity: inView ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }} />

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {/* Header */}
        <div style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          <div className="section-label" style={{ marginBottom: 18 }}>Ship tonight</div>
          <h2 style={{
            fontFamily: C.jakarta,
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            fontWeight: 800,
            color: C.bone,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: 20,
          }}>
            Build a DeFi agent <span style={{ color: C.lime }}>before sunrise.</span>
          </h2>
          <p style={{
            fontFamily: C.inter,
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: C.gray400,
            lineHeight: 1.6,
            maxWidth: 600,
            margin: '0 auto 44px',
          }}>
            Clone, install, write your strategy. The painful infra is done.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="cta-button-row" style={{
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 56,
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
        }}>
          <a className="btn-lime" href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" style={{ padding: '14px 32px', fontSize: 15 }}>
            ★ Star on GitHub
          </a>
          <a className="btn-ghost-dark" href="/swarm" target="_blank" rel="noopener noreferrer" style={{ padding: '13px 28px', fontSize: 15 }}>
            Open dashboard ↗
          </a>
        </div>

        {/* Track chips */}
        <div className="cta-chips" style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s',
        }}>
          {tracks.map((t) => (
            <a key={t.label} className="chip" href={t.url} target="_blank" rel="noopener noreferrer">
              {t.label} →
            </a>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .cta-button-row { flex-direction: column !important; width: 100%; }
          .cta-button-row > * { width: 100% !important; justify-content: center; }
          .cta-chips { flex-direction: column; align-items: stretch; }
        }
      ` }} />
    </section>
  );
}

// ─── SECTION 7: FOOTER ────────────────────────────────────────────────
function FooterSection() {
  return (
    <footer id="footer" style={{
      background: C.bg900,
      borderTop: `1px solid ${C.border}`,
      padding: '48px 48px 36px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Logo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: C.jakarta,
          fontWeight: 700,
          fontSize: 16,
          color: C.bone,
          marginBottom: 20,
        }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: C.lime,
            color: '#0D0F12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 12,
          }}>
            A
          </div>
          Voltaire
          <span style={{
            fontSize: 9,
            padding: '2px 5px',
            background: C.limeDim,
            color: C.lime,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontWeight: 500,
          }}>
            AI
          </span>
        </div>

        {/* Built-by line */}
        <div style={{
          fontFamily: C.inter,
          fontSize: 14,
          color: C.gray400,
          marginBottom: 8,
        }}>
          Built by{' '}
          <a href="https://x.com/Almond_env" target="_blank" rel="noopener noreferrer" style={{
            color: C.lime,
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            @Almond_env
          </a>
          {' '}for ETHGlobal Open Agents · May 2026
        </div>

        {/* License line */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: C.gray500,
          marginBottom: 24,
        }}>
          MIT License · Voltaire AI on VoltaireKit on 0G
        </div>

        {/* Social row */}
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <a href="https://x.com/AlmondWeb3" target="_blank" rel="noopener noreferrer" className="social-link" style={{
            width: 36,
            height: 36,
            borderRadius: 100,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.gray400,
            textDecoration: 'none',
            fontSize: 13,
            transition: 'all 0.2s',
            fontFamily: C.jakarta,
            fontWeight: 700,
          }} aria-label="X / Twitter">
            𝕏
          </a>
          <a href="https://github.com/Kingnanaweb3/voltaire-ai" target="_blank" rel="noopener noreferrer" className="social-link" style={{
            width: 36,
            height: 36,
            borderRadius: 100,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.gray400,
            textDecoration: 'none',
            fontSize: 12,
            transition: 'all 0.2s',
            fontFamily: 'monospace',
            fontWeight: 700,
          }} aria-label="GitHub">
            GH
          </a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .social-link:hover {
          border-color: ${C.lime} !important;
          color: ${C.lime} !important;
        }
      ` }} />
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//                                  PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  useFonts();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <Nav />
      <Hero />
      <HowItWorks />
      <SwarmSection />
      <VoltaireAISection />
      <SubstrateSection />
      <CTASection />
      <FooterSection />
    </>
  );
}
