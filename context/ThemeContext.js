import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

const ThemeContext = createContext();
const STORAGE_KEY = 'apeeye.theme';
const isWeb = Platform.OS === 'web';
const flushSync = isWeb ? require('react-dom').flushSync : (fn) => fn();

let transitionCssInjected = false;
function ensureTransitionCss() {
  if (transitionCssInjected || !isWeb || !globalThis.document) return;
  const style = globalThis.document.createElement('style');
  style.textContent = `
::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 0; }
::view-transition-new(root) {
  z-index: 1;
  clip-path: circle(0px at var(--ap-x, 50%) var(--ap-y, 50%));
  animation: ap-theme-reveal 620ms cubic-bezier(0.22, 0.8, 0.2, 1) forwards;
}
@keyframes ap-theme-reveal { to { clip-path: circle(var(--ap-r, 150vmax) at var(--ap-x, 50%) var(--ap-y, 50%)); } }
html.ap-theme-fade, html.ap-theme-fade * {
  transition: background-color 420ms ease, color 420ms ease, border-color 420ms ease, box-shadow 420ms ease, fill 420ms ease, stroke 420ms ease !important;
}`;
  globalThis.document.head.appendChild(style);
  transitionCssInjected = true;
}

function switchWithTransition(apply, point) {
  const doc = globalThis.document;
  if (!isWeb || !doc) return apply();
  ensureTransitionCss();
  const root = doc.documentElement;
  const W = globalThis.innerWidth || 0;
  const H = globalThis.innerHeight || 0;
  const x = point?.x ?? W - 40;
  const y = point?.y ?? 40;

  if (typeof doc.startViewTransition === 'function') {
    const r = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
    root.style.setProperty('--ap-x', `${x}px`);
    root.style.setProperty('--ap-y', `${y}px`);
    root.style.setProperty('--ap-r', `${r}px`);
    doc.startViewTransition(() => flushSync(apply));
    return;
  }
  root.classList.add('ap-theme-fade');
  apply();
  setTimeout(() => root.classList.remove('ap-theme-fade'), 480);
}

export const FONT = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
});
export const MONO = Platform.select({
  web: '"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
  default: 'monospace',
});

const palettes = {
  light: {
    background: '#f5f5f7',
    surface: '#ffffff',
    surface2: '#f2f2f7',
    fill: '#e8e8ed',
    fillHover: '#dedee3',
    border: 'rgba(0,0,0,0.06)',
    separator: 'rgba(60,60,67,0.14)',
    text: '#1d1d1f',
    secondary: '#6e6e73',
    tertiary: '#aeaeb2',
    accent: '#2da44e',
    accentHover: '#2c974b',
    accentSoft: 'rgba(45,164,78,0.12)',
    success: '#34c759',
    successSoft: 'rgba(52,199,89,0.14)',
    danger: '#ff3b30',
    dangerSoft: 'rgba(255,59,48,0.12)',
    warning: '#ff9f0a',
    warningSoft: 'rgba(255,159,10,0.14)',
    codeBg: '#f2f2f7',
    glass: 'rgba(255,255,255,0.72)',
    navGlass: 'rgba(255,255,255,0.42)',
    navEdge: '0 8px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
    shadow: '0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    shadowLg: '0 12px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
  },
  dark: {
    background: '#000000',
    surface: '#1c1c1e',
    surface2: '#2c2c2e',
    fill: '#3a3a3c',
    fillHover: '#48484a',
    border: 'rgba(255,255,255,0.08)',
    separator: 'rgba(84,84,88,0.65)',
    text: '#f5f5f7',
    secondary: '#98989d',
    tertiary: '#636366',
    accent: '#238636',
    accentHover: '#2ea043',
    accentSoft: 'rgba(35,134,54,0.22)',
    success: '#30d158',
    successSoft: 'rgba(48,209,88,0.18)',
    danger: '#ff453a',
    dangerSoft: 'rgba(255,69,58,0.18)',
    warning: '#ffd60a',
    warningSoft: 'rgba(255,214,10,0.18)',
    codeBg: '#2c2c2e',
    glass: 'rgba(28,28,30,0.72)',
    navGlass: 'rgba(255,255,255,0.06)',
    navEdge: '0 8px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.10)',
    shadow: '0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
    shadowLg: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
  },
};

function readStoredMode() {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(readStoredMode);

  useEffect(() => {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  const scheme = mode === 'system' ? (systemScheme || 'light') : mode;
  const isDark = scheme === 'dark';
  const colors = useMemo(() => {
    const p = palettes[isDark ? 'dark' : 'light'];
    return { ...p, button: p.accent, buttonText: '#ffffff', toggleText: p.secondary, muted: p.secondary };
  }, [isDark]);

  useEffect(() => {
    const doc = globalThis.document;
    if (!isWeb || !doc) return;
    doc.documentElement.style.backgroundColor = colors.background;
    doc.body.style.backgroundColor = colors.background;
    doc.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    let meta = doc.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = doc.createElement('meta'); meta.name = 'theme-color'; doc.head.appendChild(meta); }
    meta.content = colors.background;
  }, [colors.background, isDark]);

  const toggleTheme = useCallback((point) => {
    const next = isDark ? 'light' : 'dark';
    switchWithTransition(() => setMode(next), point);
  }, [isDark]);

  const value = useMemo(() => ({ mode, setMode, toggleTheme, scheme, isDark, colors }), [mode, toggleTheme, scheme, isDark, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
