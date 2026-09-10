import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { Button, IconButton, Input, Mono, confirmAction, copyText, useFadeIn, useToast } from './ui';

function Value({ value, colors }) {
  if (typeof value === 'string' && value.startsWith('data:image')) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={{ uri: value }} style={{ width: 40, height: 40, borderRadius: 8 }} />
        <Text style={{ color: colors.secondary, fontSize: 13, fontFamily: FONT }}>Image</Text>
      </View>
    );
  }
  const color = typeof value === 'number' ? colors.accent : typeof value === 'boolean' ? colors.warning : value === null ? colors.tertiary : colors.text;
  return <Mono numberOfLines={3} color={color} style={{ flexShrink: 1, textAlign: 'right' }}>{JSON.stringify(value)}</Mono>;
}

export default function RecordCard({ record, url, onReplace, onDelete, index = 0, highlight = false }) {
  const { colors } = useThemeContext();
  const toast = useToast();
  const anim = useFadeIn(highlight ? 0 : Math.min(index, 6) * 40);

  const land = useRef(new Animated.Value(highlight ? 0 : 1)).current;
  const glow = useRef(new Animated.Value(highlight ? 1 : 0)).current;
  useEffect(() => {
    if (!highlight) return;
    Animated.parallel([
      Animated.spring(land, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12 }),
      Animated.timing(glow, { toValue: 0, duration: 2000, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [highlight, land, glow]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => { setDraft(JSON.stringify(record, null, 2)); setEditing(true); };
  const save = async () => {
    let parsed;
    try { parsed = JSON.parse(draft); } catch { return toast.error('That isn’t valid JSON'); }
    setSaving(true);
    try { await onReplace(parsed); setEditing(false); toast.success(`Saved #${record.id}`); }
    catch (e) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!confirmAction(`Delete record #${record.id}?`)) return;
    try { await onDelete(); toast.success(`Deleted #${record.id}`); }
    catch (e) { toast.error(e.message || 'Delete failed'); }
  };

  const entries = Object.entries(record).filter(([k]) => k !== 'id');

  return (
    <Animated.View style={[anim, {
      backgroundColor: colors.surface, borderRadius: 16, boxShadow: colors.shadow, overflow: 'hidden',
      transform: [...anim.transform, { scale: land.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
    }]}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.accentSoft, opacity: glow, zIndex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, height: 44 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>#{record.id}</Text>
          <Text style={{ color: colors.tertiary, fontSize: 12.5, fontFamily: FONT }}>{entries.length} field{entries.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <IconButton icon="copy" title="Copy record URL" onPress={async () => ((await copyText(url)) ? toast.success('Link copied') : toast.error('Could not copy'))} />
          <IconButton icon="external" title="Open in new tab" onPress={() => Linking.openURL(url)} />
          <IconButton icon="pencil" title="Edit JSON" tone={editing ? 'accent' : undefined} onPress={editing ? () => setEditing(false) : startEdit} />
          <IconButton icon="trash" title="Delete" tone="danger" onPress={remove} />
        </View>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 16 }} />

      {editing ? (
        <View style={{ padding: 12, gap: 10 }}>
          <Input multiline value={draft} onChangeText={setDraft} />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Button title="Cancel" size="sm" variant="secondary" onPress={() => setEditing(false)} disabled={saving} />
            <Button title="Save" size="sm" onPress={save} loading={saving} />
          </View>
        </View>
      ) : entries.length === 0 ? (
        <Text style={{ color: colors.tertiary, fontSize: 13.5, fontFamily: FONT, padding: 16 }}>Empty record</Text>
      ) : (
        entries.map(([k, v], i) => (
          <View key={k}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 16, minHeight: 42, paddingVertical: 8 }}>
              <Mono numberOfLines={1} color={colors.secondary} style={{ minWidth: 80 }}>{k}</Mono>
              <Value value={v} colors={colors} />
            </View>
            {i < entries.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 16 }} /> : null}
          </View>
        ))
      )}
    </Animated.View>
  );
}
