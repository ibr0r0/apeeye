import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Linking, View, useWindowDimensions } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';
import { useWorkspace } from '../src/WorkspaceContext';
import { RESOURCE_NAME_RE } from '../shared/mockEngine';
import { Badge, Button, Caption, Card, CodeBlock, CopyButton, EmptyState, Group, IconButton, Input, Mono, Row, Title, confirmAction, useFadeIn, useToast } from '../components/ui';
import WorkspaceBar from '../components/WorkspaceBar';
import ActivityFeed from '../components/ActivityFeed';
import RecordCard from '../components/RecordCard';
import RecordForm from '../components/RecordForm';

function Collections({ selected, onSelect }) {
  const { colors } = useThemeContext();
  const toast = useToast();
  const { collections, createCollection, deleteCollection, limits } = useWorkspace();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const normalized = name.trim().toLowerCase();
  const invalid = normalized.length > 0 && !RESOURCE_NAME_RE.test(normalized);

  const add = async () => {
    if (!normalized) return;
    if (invalid) return toast.error('Lowercase letters, digits, “-” or “_”, starting with a letter.');
    setAdding(true);
    try { const c = await createCollection(normalized); setName(''); onSelect(c); toast.success(`/${c} is live`); }
    catch (e) { toast.error(e.message || 'Couldn’t create collection'); }
    finally { setAdding(false); }
  };

  const remove = async (c) => {
    if (!confirmAction(`Delete “${c}” and all of its records?`)) return;
    try { await deleteCollection(c); if (selected === c) onSelect(null); toast.success(`Deleted /${c}`); }
    catch (e) { toast.error(e.message || 'Couldn’t delete collection'); }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Caption upper>Collections</Caption>
        <Caption>{collections.length} of {limits.maxCollections}</Caption>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Input placeholder="New collection" value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" mono style={[{ flex: 1, minWidth: 0 }, invalid && { boxShadow: `0 0 0 3px ${colors.dangerSoft}` }]} />
        <Button title="Add" icon="plus" size="md" onPress={add} loading={adding} disabled={!normalized || invalid} style={{ flexShrink: 0 }} />
      </View>
      {invalid ? <Caption style={{ color: colors.danger, paddingHorizontal: 4 }}>Lowercase letters, digits, “-” or “_”, starting with a letter.</Caption> : null}

      {collections.length === 0 ? (
        <Card padded={false} style={{ paddingVertical: 8 }}>
          <EmptyState icon="folder" title="No collections yet" body="Add one above. It becomes a live endpoint the moment it exists." />
        </Card>
      ) : (
        <Group>
          {collections.map((c) => (
            <Row
              key={c} label={`/${c}`} mono active={c === selected} onPress={() => onSelect(c)}
              right={<IconButton icon="trash" title={`Delete ${c}`} tone="danger" size={28} onPress={() => remove(c)} />}
            />
          ))}
        </Group>
      )}
    </View>
  );
}

function Records({ collection }) {
  const { colors } = useThemeContext();
  const toast = useToast();
  const { listRecords, createRecord, replaceRecord, deleteRecord, deleteCollection, endpointUrl, limits } = useWorkspace();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTry, setShowTry] = useState(false);
  const [justCreated, setJustCreated] = useState(null);
  const anim = useFadeIn();

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setRecords(await listRecords(collection)); }
    catch (e) { toast.error(e.message || 'Couldn’t load records'); }
    finally { setLoading(false); }
  }, [collection, listRecords, toast]);
  useEffect(() => { refresh(); }, [refresh]);

  const url = endpointUrl(collection);
  const removeCollection = async () => {
    if (!confirmAction(`Delete “${collection}” and all of its records?`)) return;
    try { await deleteCollection(collection); toast.success(`Deleted /${collection}`); }
    catch (e) { toast.error(e.message); }
  };

  const curl = `# list
curl ${url}

# create
curl -X POST ${url} \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Ada","admin":true}'

# read · update · delete
curl ${url}/1
curl -X PATCH ${url}/1 -H 'Content-Type: application/json' -d '{"admin":false}'
curl -X DELETE ${url}/1`;

  return (
    <Animated.View style={[anim, { gap: 18 }]}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Title size={30}>/{collection}</Title>
            <Caption>{records.length} of {limits.maxRecordsPerCollection}</Caption>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button title={showTry ? 'Hide examples' : 'Examples'} icon="terminal" size="sm" variant="secondary" onPress={() => setShowTry((s) => !s)} />
            <Button title="Open" icon="external" size="sm" variant="secondary" onPress={() => Linking.openURL(url)} />
            <IconButton icon="trash" title="Delete collection" tone="danger" onPress={removeCollection} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, boxShadow: colors.shadow, paddingVertical: 8, paddingLeft: 10, paddingRight: 8 }}>
          <Badge tone="accent">GET</Badge>
          <Mono numberOfLines={1} style={{ flex: 1, fontSize: 13.5 }}>{url}</Mono>
          <CopyButton text={url} />
        </View>

        {showTry ? <CodeBlock>{curl}</CodeBlock> : null}
      </View>

      <RecordForm collection={collection} onCreate={async (body) => { const r = await createRecord(collection, body); setJustCreated(r.id); await refresh(); return r; }} />

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Caption upper>Records</Caption>
          <IconButton icon="refresh" title="Refresh" size={28} onPress={refresh} />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginVertical: 24 }} />
        ) : records.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon="layers" title="No records yet" body="Add one above, or POST to the endpoint URL from your app." />
          </Card>
        ) : (
          records.map((r, i) => (
            <RecordCard
              key={r.id} record={r} index={i} url={endpointUrl(collection, r.id)} highlight={r.id === justCreated}
              onReplace={async (body) => { await replaceRecord(collection, r.id, body); await refresh(); }}
              onDelete={async () => { await deleteRecord(collection, r.id); await refresh(); }}
            />
          ))
        )}
      </View>
    </Animated.View>
  );
}

export default function Playground() {
  const { colors } = useThemeContext();
  const { ready, storageError, collections } = useWorkspace();
  const { width } = useWindowDimensions();
  const three = width >= 1100;
  const two = width >= 800;
  const [selected, setSelected] = useState(null);
  const anim = useFadeIn();

  useEffect(() => {
    if (selected && !collections.includes(selected)) setSelected(null);
    if (!selected && collections.length >= 1) setSelected(collections[0]);
  }, [collections, selected]);

  if (storageError) {
    return (
      <Card>
        <EmptyState icon="shield" title="Browser storage unavailable" body={`${storageError}. Apeeye keeps your data in this browser (IndexedDB). Private windows or strict privacy settings can block it.`} />
      </Card>
    );
  }
  if (!ready) return <ActivityIndicator color={colors.secondary} style={{ marginTop: 60 }} />;

  const sidebar = (
    <View style={{ width: two ? 272 : '100%', gap: 20 }}>
      <Collections selected={selected} onSelect={setSelected} />
      {two && !three ? <ActivityFeed /> : null}
    </View>
  );
  const main = (
    <View style={{ flex: 1, width: '100%', minWidth: 0 }}>
      {selected ? (
        <Records key={selected} collection={selected} />
      ) : (
        <Card padded={false}>
          <EmptyState
            icon="sparkle"
            title={collections.length ? 'Pick a collection' : 'Create your first collection'}
            body={collections.length ? 'Choose one to view and edit its records.' : 'Type a name like “users” and press Add. Each collection is a live REST endpoint you can call from anywhere.'}
          />
        </Card>
      )}
    </View>
  );

  return (
    <Animated.View style={[anim, { gap: 22 }]}>
      <WorkspaceBar />
      <View style={{ flexDirection: two ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}>
        {sidebar}
        {main}
        {three ? <View style={{ width: 300 }}><ActivityFeed /></View> : null}
      </View>
      {!two ? <ActivityFeed /> : null}
    </Animated.View>
  );
}
