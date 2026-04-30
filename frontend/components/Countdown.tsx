'use client';
import { useEffect, useState } from 'react';
import { T } from '@/lib/tokens';

export function Countdown() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date(), next = new Date();
      next.setUTCHours(9, 0, 0, 0);
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
      const diff = +next - +now;
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: T.mono, fontSize: 22, color: T.lime, letterSpacing: 2 }}>{time}</span>;
}
