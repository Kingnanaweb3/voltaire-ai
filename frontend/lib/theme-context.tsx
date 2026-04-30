'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setThemeMode } from './tokens';

type ThemeMode = 'dark' | 'light';

const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // On mount: hydrate from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('voltaire:theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
      setThemeMode(saved);
    }
  }, []);

  // On mode change: persist + sync runtime + body bg
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setThemeMode(mode);
    localStorage.setItem('voltaire:theme', mode);
    document.body.style.background = mode === 'dark' ? '#0E1012' : '#FAFAF7';
  }, [mode]);

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <div key={mode} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
