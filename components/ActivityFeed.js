import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { useWorkspace } from '../src/WorkspaceContext';
import { Badge, Body, Card, Icon, Mono, Title, methodTone, statusTone } from './ui';

function relTime(ts, now) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function ActivityRow({ it, now, colors, tone }) {
  const fresh = useRef(Date.now() - it.at < 1500).current;
  const enter = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  const flash = useRef(new Animated.Value(fresh ? 1 : 0)).current;

  useEffect(() => {
    if (!fresh) return;
    Animated.parallel([
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 9 }),
      Animated.timing(flash, { toValue: 0, duration: 1800, delay: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fresh, enter, flash]);

  return (
    <Animated.View style={{
      opacity: enter,
      transform: [
        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
        { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
      ],
    }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: -10, right: -10, bottom: 0, borderRadius: 10, backgroundColor: colors.accentSoft, opacity: flash }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
        <Badge tone={methodTone(it.method)} style={{ minWidth: 56 }}>{it.method}</Badge>
        <Mono numberOfLines={1} style={{ flex: 1, fontSize: 12.5 }}>{it.path}</Mono>
        <Text style={{ color: tone[statusTone(it.status)], fontSize: 12.5, fontWeight: '600', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{it.status}</Text>
        <Text style={{ color: colors.tertiary, fontSize: 11.5, minWidth: 28, textAlign: 'right', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{relTime(it.at, now)}</Text>
      </View>
    </Animated.View>
  );
}

export default function ActivityFeed({ limit = 14 }) {
  const { colors } = useThemeContext();
  const { activity } = useWorkspace();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(i); }, []);
  const items = activity.slice(0, limit);
  const tone = { accent: colors.accent, success: colors.success, warning: colors.warning, danger: colors.danger, muted: colors.secondary };

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title size={17}>Activity</Title>
        <Icon name="activity" size={16} color={colors.tertiary} />
      </View>
      {items.length === 0 ? (
        <Body secondary style={{ fontSize: 13.5, lineHeight: 19 }}>Requests to your endpoints from other apps, curl or Postman appear here as they happen.</Body>
      ) : (
        <View style={{ gap: 2 }}>
          {items.map((it) => <ActivityRow key={it.key} it={it} now={now} colors={colors} tone={tone} />)}
        </View>
      )}
    </Card>
  );
}
