'use client';
import { useEffect, useRef, useState } from 'react';
import { T } from '@/lib/tokens';

export function Terminal({ lines = [], live = false }: {
  lines: any[];
  live?: boolean;
}) {
  const [shown, setShown] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (live) { setShown(lines.map(l => typeof l === 'string' ? l : l.text || JSON.stringify(l))); return; }
    setShown([]);
    lines.forEach(({ t, text }: any) => setTimeout(() => setShown(p => [...p, text]), t));
  }, [lines.length, live]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [shown]);

  return (
    <div ref={ref} style={{
      fontFamily: T.mono, fontSize: 11, color: T.lime,
      lineHeight: 2, overflowY: 'auto', maxHeight: 200,
    }}>
      {shown.map((l, i) => (
        <div key={i} style={{ opacity: i === shown.length - 1 ? 1 : 0.6 }}>{l}</div>
      ))}
      <span style={{
        display: 'inline-block', width: 8, height: 13,
        background: T.lime, marginLeft: 2,
        animation: 'blink 1s step-end infinite',
        verticalAlign: 'middle',
      }} />
    </div>
  );
}
