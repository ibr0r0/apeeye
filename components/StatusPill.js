import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { useWorkspace, RELAY_STATUS } from '../src/WorkspaceContext';

const META = {
  [RELAY_STATUS.ONLINE]: { label: 'Live', tone: 'success' },
  [RELAY_STATUS.CONNECTING]: { label: 'Connecting', tone: 'muted' },
  [RELAY_STATUS.RECONNECTING]: { label: 'Reconnecting', tone: 'warning' },
  [RELAY_STATUS.OFFLINE]: { label: 'Offline', tone: 'danger' },
  [RELAY_STATUS.REPLACED]: { label: 'Another tab is live', tone: 'warning' },
};

export default function StatusPill({ compact = false, bare = false }) {
  const { colors } = useThemeContext();
  const { relayStatus, reconnect } = useWorkspace();
  const { label, tone } = META[relayStatus] || META[RELAY_STATUS.OFFLINE];
  const dot = { success: colors.success, warning: colors.warning, danger: colors.danger, muted: colors.tertiary }[tone];
  const clickable = relayStatus === RELAY_STATUS.REPLACED || relayStatus === RELAY_STATUS.OFFLINE;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (relayStatus !== RELAY_STATUS.ONLINE) { pulse.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [relayStatus, pulse]);

  return (
    <Pressable
      onPress={clickable ? reconnect : undefined} disabled={!clickable}
      accessibilityLabel={`Connection: ${label}`}
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingHorizontal: compact ? 8 : 12, borderRadius: 15,
        backgroundColor: hovered && clickable ? colors.fill : bare ? 'transparent' : colors.surface2,
      })}
    >
      <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
        {relayStatus === RELAY_STATUS.ONLINE ? (
          <Animated.View style={{
            position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: dot,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
          }} />
        ) : null}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      </View>
      {!compact ? <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>{label}</Text> : null}
      {clickable && !compact ? <Text style={{ color: colors.accent, fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>Use this tab</Text> : null}
    </Pressable>
  );
}
