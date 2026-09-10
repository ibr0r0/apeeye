import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { Button, Caption, Card, IconButton, Input, Segmented, Title, useToast } from './ui';

const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
const TYPES = ['string', 'number', 'boolean', 'json'];

function coerce(f) {
  const raw = f.value;
  switch (f.type) {
    case 'number': { const n = Number(raw); if (raw === '' || Number.isNaN(n)) throw new Error(`“${f.key}” isn’t a valid number`); return n; }
    case 'boolean': return String(raw).trim().toLowerCase() === 'true';
    case 'json': try { return JSON.parse(raw); } catch { throw new Error(`“${f.key}” isn’t valid JSON`); }
    default: return raw;
  }
}

function TypePicker({ value, onChange }) {
  const { colors } = useThemeContext();
  return (
    <View style={{ flexDirection: 'row', gap: 2, backgroundColor: colors.surface2, borderRadius: 14, padding: 2, flexShrink: 0 }}>
      {TYPES.map((ty) => (
        <Pressable key={ty} onPress={() => onChange(ty)} style={({ hovered }) => ({
          height: 24, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
          backgroundColor: value === ty ? colors.surface : hovered ? colors.fill : 'transparent',
          boxShadow: value === ty ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        })}>
          <Text style={{ fontSize: 11.5, fontWeight: '600', fontFamily: FONT, color: value === ty ? colors.accent : colors.secondary }}>{ty}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function RecordForm({ collection, onCreate }) {
  const toast = useToast();
  const [cardW, setCardW] = useState(0);
  const narrow = cardW > 0 && cardW < 640;

  const [mode, setMode] = useState('fields');
  const [fields, setFields] = useState([{ key: '', value: '', type: 'string' }]);
  const [json, setJson] = useState('{\n  "name": ""\n}');
  const [saving, setSaving] = useState(false);

  const update = (i, patch) => setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setFields((f) => (f.length === 1 ? [{ key: '', value: '', type: 'string' }] : f.filter((_, idx) => idx !== i)));
  const add = () => setFields((f) => [...f, { key: '', value: '', type: 'string' }]);

  const addImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) return toast.error('Couldn’t read that image');
      const data = `data:image/jpeg;base64,${asset.base64}`;
      if (data.length > MAX_IMAGE_BASE64_BYTES) return toast.error('Image is too large (about 3 MB max)');
      setFields((f) => [...f.filter((x) => x.key || x.value), { key: 'image', value: data, type: 'string' }]);
    } catch { toast.error('Image picker failed'); }
  };

  const submit = async () => {
    let payload;
    try {
      if (mode === 'json') {
        payload = JSON.parse(json);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Body must be a JSON object');
      } else {
        const usable = fields.filter((f) => f.key.trim());
        if (!usable.length) throw new Error('Add at least one field with a key');
        payload = {};
        for (const f of usable) payload[f.key.trim()] = coerce(f);
      }
    } catch (e) { return toast.error(e instanceof SyntaxError ? 'Invalid JSON' : e.message); }

    setSaving(true);
    try {
      const created = await onCreate(payload);
      toast.success(`Added #${created.id} to /${collection}`);
      setFields([{ key: '', value: '', type: 'string' }]);
      setJson('{\n  "name": ""\n}');
    } catch (e) { toast.error(e.message || 'Couldn’t save record'); }
    finally { setSaving(false); }
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Title size={17}>New record</Title>
        <Segmented options={[{ id: 'fields', label: 'Fields' }, { id: 'json', label: 'JSON' }]} value={mode} onChange={setMode} style={{ width: 176 }} />
      </View>

      {mode === 'json' ? (
        <Input multiline value={json} onChangeText={setJson} placeholder='{ "name": "Ada", "admin": true }' />
      ) : (
        <View style={{ gap: 10 }} onLayout={(e) => setCardW(e.nativeEvent.layout.width)}>
          {fields.map((f, i) => {
            const isImage = typeof f.value === 'string' && f.value.startsWith('data:image');
            const picker = (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: narrow ? 0 : 'auto', flexShrink: 0 }}>
                {!isImage ? <TypePicker value={f.type} onChange={(ty) => update(i, { type: ty })} /> : null}
                <IconButton icon="close" title="Remove field" onPress={() => remove(i)} size={28} />
              </View>
            );
            return (
              <View key={i} style={{ gap: 8, paddingBottom: narrow && i < fields.length - 1 ? 6 : 0 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input placeholder="key" value={f.key} onChangeText={(v) => update(i, { key: v })} mono style={{ flex: 1, minWidth: 96 }} />
                  {isImage ? (
                    <View style={{ flex: 2, minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image source={{ uri: f.value }} style={{ width: 38, height: 38, borderRadius: 8 }} />
                      <Caption>Image attached</Caption>
                    </View>
                  ) : (
                    <Input
                      placeholder={f.type === 'json' ? '[1, 2] or {"a": 1}' : f.type === 'boolean' ? 'true or false' : 'value'}
                      value={String(f.value)} onChangeText={(v) => update(i, { value: v })}
                      onSubmitEditing={submit} style={{ flex: 2, minWidth: 140 }}
                    />
                  )}
                  {!narrow ? picker : null}
                </View>
                {narrow ? picker : null}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Add field" icon="plus" size="sm" variant="secondary" onPress={add} />
            <Button title="Image" icon="image" size="sm" variant="secondary" onPress={addImage} />
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Caption>An id is assigned automatically.</Caption>
        <Button title="Save record" onPress={submit} loading={saving} />
      </View>
    </Card>
  );
}
