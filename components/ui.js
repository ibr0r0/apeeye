import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeContext, FONT, MONO } from '../context/ThemeContext';

export { FONT, MONO };
const isWeb = Platform.OS === 'web';
const LTR = { writingDirection: 'ltr', textAlign: 'left' };

export async function copyText(text) {
  try {
    if (globalThis.navigator?.clipboard?.writeText) { await globalThis.navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const doc = globalThis.document; if (!doc) return false;
    const ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'absolute'; ta.style.left = '-9999px'; doc.body.appendChild(ta); ta.select();
    const ok = doc.execCommand('copy'); doc.body.removeChild(ta); return ok;
  } catch { return false; }
}

export function confirmAction(message) {
  return typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true;
}

export const BLUR = { blur: '1' };
let blurCssInjected = false;
export function ensureBlurCss() {
  if (blurCssInjected || !isWeb) return;
  const doc = globalThis.document;
  if (!doc) return;
  const style = doc.createElement('style');
  style.textContent = '[data-blur="1"],#apeeye-nav{backdrop-filter:saturate(180%) blur(22px)!important;-webkit-backdrop-filter:saturate(180%) blur(22px)!important;}';
  doc.head.appendChild(style);
  blurCssInjected = true;
}

export function useFadeIn(delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
}

const PATHS = {
  copy: 'M9 9h10v10H9zM5 15V5h10',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  external: 'M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  pencil: 'M4 20h4l11-11-4-4L4 16zM13 7l4 4',
  check: 'M5 12l5 5L20 7',
  download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
  upload: 'M12 20V8M6 14l6-6 6 6M4 4h16',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  close: 'M6 6l12 12M18 6L6 18',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
  terminal: 'M5 7l5 5-5 5M12 17h7',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01',
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19h.01',
  wifiOff: 'M2 2l20 20M9 16a5 5 0 0 1 6 0M12 19h.01M5.5 12.5a10 10 0 0 1 4.3-2.6M15.7 8.6A15 15 0 0 1 22 9',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.5-4.5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  sparkle: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
};

export function Icon({ name, size = 18, color, stroke = 1.8, style }) {
  const { colors } = useThemeContext();
  const d = PATHS[name];
  if (!d) return null;
  if (!isWeb) return <View style={[{ width: size, height: size }, style]} />;
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color || colors.text, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', flexShrink: 0, ...(style || {}) },
    'aria-hidden': true,
  }, React.createElement('path', { d }));
}

function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(() => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 0 }).start(), [scale, to]);
  const onPressOut = useCallback(() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start(), [scale]);
  return { scale, onPressIn, onPressOut };
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  useEffect(() => { ensureBlurCss(); }, []);
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback((message, type = 'info', ttl = 2800) => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);
  const api = useMemo(() => ({
    show, success: (m) => show(m, 'success'), error: (m) => show(m, 'error', 4500), info: (m) => show(m, 'info'),
  }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={styles.toastViewport}>
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
      </View>
    </ToastContext.Provider>
  );
}
export function useToast() { return useContext(ToastContext); }

function Toast({ toast, onDismiss }) {
  const { colors } = useThemeContext();
  const anim = useFadeIn();
  const icon = { success: 'check', error: 'close', info: 'info' }[toast.type];
  const tone = { success: colors.success, error: colors.danger, info: colors.accent }[toast.type];
  return (
    <Animated.View style={[anim, { alignItems: 'center' }]}>
      <Pressable onPress={onDismiss} dataSet={BLUR} style={[styles.toast, { backgroundColor: colors.glass, boxShadow: colors.shadowLg }]}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={13} color="#fff" stroke={2.5} />
        </View>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', fontFamily: FONT }}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, iconRight, disabled, loading, style, accessibilityLabel }) {
  const { colors } = useThemeContext();
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  const v = {
    primary: { bg: colors.accent, hover: colors.accentHover, fg: '#ffffff' },
    secondary: { bg: colors.fill, hover: colors.fillHover, fg: colors.text },
    tinted: { bg: colors.accentSoft, hover: colors.accentSoft, fg: colors.accent },
    destructive: { bg: colors.dangerSoft, hover: colors.dangerSoft, fg: colors.danger },
    plain: { bg: 'transparent', hover: colors.fill, fg: colors.accent },
  }[variant];
  const dims = { sm: { h: 30, px: 12, fs: 13 }, md: { h: 36, px: 16, fs: 14 }, lg: { h: 46, px: 22, fs: 16 } }[size];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={off}
      accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
      style={({ hovered }) => [{ opacity: off ? 0.45 : 1 }, style]}
    >
      {({ hovered }) => (
        <Animated.View style={[styles.button, {
          height: dims.h, paddingHorizontal: dims.px, borderRadius: dims.h / 2,
          backgroundColor: hovered && !off ? v.hover : v.bg, transform: [{ scale }],
        }]}>
          {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={dims.fs + 2} color={v.fg} stroke={2} /> : null}
          <Text style={{ color: v.fg, fontSize: dims.fs, fontWeight: '600', fontFamily: FONT, letterSpacing: -0.1 }}>{title}</Text>
          {iconRight ? <Icon name={iconRight} size={dims.fs + 2} color={v.fg} stroke={2} /> : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, title, tone, size = 32, style }) {
  const { colors } = useThemeContext();
  const { scale, onPressIn, onPressOut } = usePressScale(0.9);
  const color = tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.secondary;
  return (
    <Pressable
      onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
      accessibilityRole="button" accessibilityLabel={title} {...(isWeb ? { title } : {})}
      style={style}
    >
      {({ hovered }) => (
        <Animated.View style={{
          width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
          backgroundColor: hovered ? colors.fill : 'transparent', transform: [{ scale }],
        }}>
          <Icon name={icon} size={size * 0.5} color={color} stroke={2} />
        </Animated.View>
      )}
    </Pressable>
  );
}

export function CopyButton({ text, label = 'Copy', size = 'sm', variant = 'secondary' }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  const onPress = async () => {
    if (await copyText(text)) { setDone(true); setTimeout(() => setDone(false), 1400); }
    else toast?.error('Could not copy');
  };
  return <Button title={done ? 'Copied' : label} icon={done ? 'check' : 'copy'} size={size} variant={done ? 'tinted' : variant} onPress={onPress} />;
}

export function Card({ children, style, padded = true, elevated = false }) {
  const { colors } = useThemeContext();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, boxShadow: elevated ? colors.shadowLg : colors.shadow }, padded && { padding: 20 }, style]}>
      {children}
    </View>
  );
}

export function Group({ children, style }) {
  const { colors } = useThemeContext();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', boxShadow: colors.shadow }, style]}>
      {items.map((child, i) => (
        <View key={child.key ?? i}>
          {child}
          {i < items.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginStart: 16 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function Row({ label, value, right, onPress, active, icon, mono, children, style }) {
  const { colors } = useThemeContext();
  const body = (
    <View style={[styles.row, { backgroundColor: active ? colors.accentSoft : 'transparent' }, style]}>
      {icon ? <Icon name={icon} size={18} color={active ? colors.accent : colors.secondary} /> : null}
      {label != null ? <Text numberOfLines={1} style={{ flex: value != null ? 0 : 1, color: active ? colors.accent : colors.text, fontSize: 15, fontWeight: active ? '600' : '400', fontFamily: mono ? MONO : FONT }}>{label}</Text> : null}
      {value != null ? <Text numberOfLines={1} selectable style={{ flex: 1, textAlign: 'right', color: colors.secondary, fontSize: 14, fontFamily: mono ? MONO : FONT }}>{value}</Text> : null}
      {children}
      {right}
      {onPress && !right ? <Icon name="chevronRight" size={16} color={colors.tertiary} /> : null}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ hovered }) => ({ backgroundColor: hovered && !active ? colors.surface2 : 'transparent' })}>{body}</Pressable>;
}

export function Segmented({ options, value, onChange, style, height = 28 }) {
  const { colors } = useThemeContext();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const seg = w ? (w - 4) / options.length : 0;
  const radius = height / 2 + 2;
  useEffect(() => {
    Animated.timing(x, { toValue: idx * seg, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [idx, seg, x]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', backgroundColor: colors.fill, borderRadius: radius, padding: 2, position: 'relative', overflow: 'hidden', flexShrink: 0 }, style]}>
      {w ? <Animated.View style={{ position: 'absolute', top: 2, left: 2, width: seg, height, borderRadius: height / 2, backgroundColor: colors.surface, boxShadow: '0 1px 4px rgba(0,0,0,0.14)', transform: [{ translateX: x }] }} /> : null}
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={({ hovered }) => ({ flex: 1, height, alignItems: 'center', justifyContent: 'center', opacity: hovered && o.id !== value ? 0.75 : 1 })}>
          <Text style={{ fontSize: height >= 34 ? 14 : 13, fontWeight: '600', color: o.id === value ? colors.text : colors.secondary, fontFamily: FONT, letterSpacing: -0.1 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Input({ style, mono, ...props }) {
  const { colors } = useThemeContext();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.tertiary}
      autoCapitalize="none" autoCorrect={false}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      {...props}
      style={[
        styles.input,
        { backgroundColor: colors.surface2, color: colors.text, fontFamily: mono ? MONO : FONT, boxShadow: focused ? `0 0 0 3px ${colors.accentSoft}` : 'none' },
        isWeb && { outlineStyle: 'none' },
        (mono || props.multiline) && LTR,
        props.multiline && { minHeight: 132, textAlignVertical: 'top', fontFamily: MONO, fontSize: 13, lineHeight: 20, paddingTop: 12 },
        style,
      ]}
    />
  );
}

export function Title({ children, size = 28, style }) {
  const { colors } = useThemeContext();
  return <Text style={[{ color: colors.text, fontSize: size, fontWeight: '700', letterSpacing: size >= 28 ? -0.6 : -0.3, fontFamily: FONT }, style]}>{children}</Text>;
}
export function Body({ children, style, secondary }) {
  const { colors } = useThemeContext();
  return <Text style={[{ color: secondary ? colors.secondary : colors.text, fontSize: 15, lineHeight: 22, fontFamily: FONT }, style]}>{children}</Text>;
}
export function Caption({ children, style, upper }) {
  const { colors } = useThemeContext();
  return <Text style={[{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontFamily: FONT }, upper && { textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }, style]}>{children}</Text>;
}
export function Mono({ children, style, numberOfLines, color }) {
  const { colors } = useThemeContext();
  return <Text numberOfLines={numberOfLines} selectable style={[{ fontFamily: MONO, fontSize: 13, color: color || colors.text }, LTR, style]}>{children}</Text>;
}
export function CodeBlock({ children, style }) {
  const { colors } = useThemeContext();
  return (
    <View dir="ltr" style={[{ backgroundColor: colors.codeBg, borderRadius: 12, padding: 14 }, style]}>
      <Mono style={{ lineHeight: 20 }}>{children}</Mono>
    </View>
  );
}
export function Badge({ children, tone = 'muted', style }) {
  const { colors } = useThemeContext();
  const m = {
    muted: { bg: colors.fill, fg: colors.secondary }, accent: { bg: colors.accentSoft, fg: colors.accent },
    success: { bg: colors.successSoft, fg: colors.success }, danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  }[tone];
  return (
    <View style={[{ backgroundColor: m.bg, paddingHorizontal: 8, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: m.fg, fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 }}>{children}</Text>
    </View>
  );
}
export function EmptyState({ icon = 'box', title, body, action }) {
  const { colors } = useThemeContext();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name={icon} size={26} color={colors.secondary} stroke={1.6} />
      </View>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', fontFamily: FONT, textAlign: 'center' }}>{title}</Text>
      {body ? <Body secondary style={{ textAlign: 'center', marginTop: 6, maxWidth: 380, fontSize: 14, lineHeight: 20 }}>{body}</Body> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function methodTone(m) {
  switch (String(m).toUpperCase()) {
    case 'GET': return 'accent'; case 'POST': return 'success';
    case 'PUT': case 'PATCH': return 'warning'; case 'DELETE': return 'danger'; default: return 'muted';
  }
}
export function statusTone(s) { return s >= 500 ? 'danger' : s >= 400 ? 'warning' : s >= 200 ? 'success' : 'muted'; }

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  card: { borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingVertical: 10, paddingHorizontal: 16 },
  input: { height: 38, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, minWidth: 0, flexShrink: 1 },
  toastViewport: { position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingStart: 10, paddingEnd: 18, borderRadius: 999 },
});
