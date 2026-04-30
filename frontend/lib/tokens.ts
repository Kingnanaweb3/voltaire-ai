export const darkTokens = {
  bg: "#0E1012",
  surface: "#16191D",
  surfaceHover: "#1C2026",
  card: "#1A1D22",
  border: "rgba(255,255,255,0.06)",
  borderAccent: "rgba(163,230,53,0.25)",
  lime: "#A3E635",
  limeDim: "rgba(163,230,53,0.12)",
  limeGlow: "rgba(163,230,53,0.08)",
  limeText: "#B8F04A",
  red: "#F87171",
  amber: "#FBBF24",
  blue: "#60A5FA",
  purple: "#8B5CF6",
  textPrimary: "#F0F2F5",
  textSecondary: "#6B7280",
  textMuted: "#374151",
  mono: "'JetBrains Mono', monospace",
  sans: "'Plus Jakarta Sans', sans-serif",
};

export const lightTokens = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceHover: "#F4F4F0",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  borderAccent: "rgba(132,204,22,0.4)",
  lime: "#65A30D",
  limeDim: "rgba(132,204,22,0.12)",
  limeGlow: "rgba(132,204,22,0.06)",
  limeText: "#4D7C0F",
  red: "#DC2626",
  amber: "#D97706",
  blue: "#2563EB",
  purple: "#7C3AED",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  mono: "'JetBrains Mono', monospace",
  sans: "'Plus Jakarta Sans', sans-serif",
};

// Runtime mode — mutated by ThemeProvider
let currentMode: 'dark' | 'light' = 'dark';
export const setThemeMode = (m: 'dark' | 'light') => { currentMode = m; };
export const getThemeMode = (): 'dark' | 'light' => currentMode;

// T is a Proxy that reads from the current mode at access time
export const T: typeof darkTokens = new Proxy({} as typeof darkTokens, {
  get(_, prop: string) {
    const tokens = currentMode === 'dark' ? darkTokens : lightTokens;
    return tokens[prop as keyof typeof darkTokens];
  },
});
