import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';
import { useWorkspace, RELAY_STATUS } from '../src/WorkspaceContext';
import { Body, Button, Caption, Card, CopyButton, Mono, Title, confirmAction, useToast } from './ui';

const HINT = {
  [RELAY_STATUS.ONLINE]: 'Your endpoints answer as long as this tab stays open.',
  [RELAY_STATUS.CONNECTING]: 'Connecting to the relay…',
  [RELAY_STATUS.RECONNECTING]: 'Connection dropped. Retrying. Your data is safe in this browser.',
  [RELAY_STATUS.OFFLINE]: 'Not connected. Endpoints answer again once the relay is reachable.',
  [RELAY_STATUS.REPLACED]: 'Another tab took over this workspace. Use the status control to take it back.',
};

export default function WorkspaceBar() {
  const { colors } = useThemeContext();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const narrow = width < 760;
  const { workspaceId, workspaceUrl, relayStatus, exportWorkspace, importWorkspace, resetWorkspace } = useWorkspace();
  const [busy, setBusy] = useState('');

  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); const msg = typeof ok === 'function' ? ok(r) : ok; if (msg) toast.success(msg); }
    catch (e) { toast.error(e.message || 'Something went wrong'); }
    finally { setBusy(''); }
  };

  const onImport = () => {
    if (!confirmAction('Importing replaces everything in this workspace. Continue?')) return;
    run('import', importWorkspace, (n) => (n == null ? null : `Imported ${n} collection${n === 1 ? '' : 's'}`));
  };
  const onReset = () => {
    if (!confirmAction('Reset this workspace? All data is wiped and you get a new URL. Export first to keep anything.')) return;
    run('reset', resetWorkspace, (id) => `New workspace ${id}`);
  };

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: narrow ? 'column' : 'row', justifyContent: 'space-between', alignItems: narrow ? 'stretch' : 'center', gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Caption upper>Workspace</Caption>
          <Title size={24}>{workspaceId}</Title>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Export" icon="download" size="sm" variant="secondary" onPress={() => run('export', exportWorkspace, 'Export downloaded')} loading={busy === 'export'} />
          <Button title="Import" icon="upload" size="sm" variant="secondary" onPress={onImport} loading={busy === 'import'} />
          <Button title="Reset" size="sm" variant="destructive" onPress={onReset} loading={busy === 'reset'} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.codeBg, borderRadius: 12, paddingVertical: 8, paddingLeft: 14, paddingRight: 8 }}>
        <Mono numberOfLines={1} style={{ flex: 1, fontSize: 13.5 }}>{workspaceUrl}</Mono>
        <CopyButton text={workspaceUrl} />
      </View>

      <Body secondary style={{ fontSize: 13.5, lineHeight: 19 }}>{HINT[relayStatus] || HINT[RELAY_STATUS.OFFLINE]}</Body>
    </Card>
  );
}
