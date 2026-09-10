import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { BLUR, Icon, Segmented, ensureBlurCss } from './ui';
import StatusPill from './StatusPill';

const LINKS = [
  { id: 'Home', label: 'Home' },
  { id: 'Playground', label: 'Playground' },
  { id: 'Docs', label: 'Docs' },
];

function ThemeToggle() {
  const { colors, isDark, toggleTheme } = useThemeContext();
  const spin = useRef(new Animated.Value(0)).current;
  const turns = useRef(0);
  const scale = useRef(new Animated.Value(1)).current;

  const onPress = (e) => {
    const ne = e?.nativeEvent || {};
    const x = ne.clientX ?? ne.pageX;
    const y = ne.clientY ?? ne.pageY;
    turns.current += 1;
    Animated.parallel([
      Animated.timing(spin, { toValue: turns.current, duration: 620, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.7, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]),
    ]).start();
    toggleTheme(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined);
  };

  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} title={label}>
      {({ hovered }) => (
        <Animated.View style={{
          width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: hovered ? colors.fill : 'transparent',
          transform: [{ rotate }, { scale }],
        }}>
          <Icon name={isDark ? 'sun' : 'moon'} size={16} color={colors.secondary} stroke={2} />
        </Animated.View>
      )}
    </Pressable>
  );
}

export default function Navbar({ currentPage, navigate }) {
  const { colors } = useThemeContext();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const tiny = width < 420;
  React.useEffect(() => { ensureBlurCss(); }, []);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View nativeID="apeeye-nav" dataSet={BLUR} style={[styles.island, { backgroundColor: 'transparent', borderColor: colors.border }, compact && { paddingHorizontal: 10 }]}>
        <Pressable onPress={() => navigate('Home')} accessibilityRole="link" style={styles.brand}>
          <Text style={{ fontSize: 22, lineHeight: 26 }}>🐒</Text>
          {!compact ? <Text style={[styles.brandText, { color: colors.text }]}>Apeeye</Text> : null}
        </Pressable>

        <View style={[styles.center, compact && { flex: 1, marginHorizontal: 8 }]}>
          <Segmented
            options={tiny ? LINKS.map((l) => ({ ...l, label: l.label.slice(0, 4) })) : LINKS}
            value={currentPage}
            onChange={navigate}
            height={34}
            style={{ width: compact ? '100%' : 320 }}
          />
        </View>

        <View style={styles.right}>
          <StatusPill compact={compact} bare />
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  island: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    height: 56,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  brandText: { fontWeight: '700', fontSize: 17, letterSpacing: -0.4, fontFamily: FONT },
  center: { alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
