import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Linking } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';

const API_URL = 'http://localhost:34567';

export default function Playground() {
  const { colors } = useThemeContext();
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState([]);
  const [newRecord, setNewRecord] = useState('{}');

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_URL}/api/endpoints`);
      const data = await res.json();
      setResources(data);
    } catch {
      setError('Failed to fetch resources');
    }
  };

  const fetchRecords = async (resource) => {
    try {
      const res = await fetch(`${API_URL}/mock/${resource}`);
      const data = await res.json();
      setRecords(data);
      setSelected(resource);
    } catch {
      setError('Failed to fetch records');
    }
  };

  const addResource = async () => {
    setError('');
    if (!newResource.trim()) return setError('Resource name is required');
    try {
      await fetch(`${API_URL}/api/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: newResource.trim() }),
      });
      setNewResource('');
      fetchResources();
    } catch {
      setError('Failed to add resource');
    }
  };

  const addRecord = async () => {
    setError('');
    try {
      const payload = JSON.parse(newRecord);
      const res = await fetch(`${API_URL}/mock/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add');
      setNewRecord('{}');
      fetchRecords(selected);
    } catch {
      setError('Invalid JSON or failed to save');
    }
  };

  const deleteRecord = async (id) => {
    try {
      await fetch(`${API_URL}/mock/${selected}/${id}`, { method: 'DELETE' });
      fetchRecords(selected);
    } catch {
      setError('Failed to delete record');
    }
  };

  const patchRecord = async (id) => {
    try {
      await fetch(`${API_URL}/mock/${selected}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updated: true }),
      });
      fetchRecords(selected);
    } catch {
      setError('Failed to patch record');
    }
  };


  function EditableRecordItem({ item, selected, colors, onRefresh, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editJson, setEditJson] = useState(JSON.stringify(item, null, 2));
    const recordUrl = `${API_URL}/mock/${selected}/${item.id}`;
  
    const handleSave = async () => {
      try {
        const patchBody = JSON.parse(editJson);
        await fetch(`${API_URL}/mock/${selected}/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        setIsEditing(false);
        onRefresh();
      } catch (e) {
        Alert.alert('Invalid JSON');
      }
    };
  
    return (
      <View style={{
        backgroundColor: colors.surface,
        padding: 10,
        marginBottom: 12,
        borderRadius: 6,
        borderColor: colors.border,
        borderWidth: 1,
      }}>
        {isEditing ? (
          <>
            <TextInput
              multiline
              value={editJson}
              onChangeText={setEditJson}
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                fontSize: 12,
                height: 120,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 10,
                borderRadius: 6,
                textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Pressable onPress={handleSave} style={{ marginRight: 10 }}>
                <Text style={{ color: colors.button, fontWeight: 'bold' }}>Save</Text>
              </Pressable>
              <Pressable onPress={() => setIsEditing(false)}>
                <Text style={{ color: '#999', fontWeight: 'bold' }}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={{ color: colors.text }}>{JSON.stringify(item, null, 2)}</Text>
  
            <Pressable onPress={() => Linking.openURL(recordUrl)} style={{ marginTop: 6 }}>
              <Text style={{
                color: colors.button,
                fontSize: 13,
                textDecorationLine: 'underline'
              }}>
                Open GET URL: {recordUrl}
              </Text>
            </Pressable>
  
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Pressable onPress={() => setIsEditing(true)} style={{ marginRight: 14 }}>
                <Text style={{ color: colors.button, fontWeight: 'bold' }}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => onDelete(item.id)}>
                <Text style={{ color: '#E85B5B', fontWeight: 'bold' }}>Delete</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  }
  

  return (
    <View style={{ padding: 16, flex: 1, backgroundColor: colors.background }}>
<Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
🐒 Apeeye Endpoints
</Text>
      <FlatList
        data={resources}
        keyExtractor={(item) => item}
        horizontal
        style={{ marginVertical: 12 }}
        renderItem={({ item }) => (
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: selected === item ? colors.button : colors.surface,
  marginRight: 8,
  borderRadius: 6,
  borderColor: colors.border,
  borderWidth: 1,
}}>
  <Pressable
    onPress={() => fetchRecords(item)}
    style={{ padding: 10 }}
  >
    <Text style={{
      color: selected === item ? colors.buttonText : colors.text,
      fontWeight: 'bold'
    }}>
      {item}
    </Text>
  </Pressable>

  <Pressable
  onPress={async () => {
    const shouldDelete = confirm(`Delete '${item}' collection?`);
    if (!shouldDelete) return;

    console.log('Deleting collection:', item);
    try {
      await fetch(`${API_URL}/api/endpoints/${item}`, { method: 'DELETE' });
      if (selected === item) {
        setSelected(null);
        setRecords([]);
      }
      fetchResources();
    } catch (e) {
      console.error(e);
      setError('Failed to delete collection');
    }
  }}
  style={{ padding: 6, paddingRight: 10 }}
>
  <Text style={{ color: '#E85B5B', fontSize: 14 }}>✕</Text>
</Pressable>

</View>

        )}
      />

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TextInput
          value={newResource}
          onChangeText={setNewResource}
          placeholder="Add new resource (e.g. users)"
          placeholderTextColor={colors.toggleText}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            color: colors.text,
            padding: 10,
            borderRadius: 6,
            borderColor: colors.border,
            borderWidth: 1,
            marginRight: 8,
          }}
        />
        <Pressable
          onPress={addResource}
          style={{
            backgroundColor: colors.button,
            paddingHorizontal: 16,
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <Text style={{ color: colors.buttonText, fontWeight: 'bold' }}>Add</Text>
        </Pressable>
      </View>

      {selected && (
        <>
          <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600', marginBottom: 10 }}>
            Records in: {selected}
          </Text>

          <FlatList
            data={records}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <EditableRecordItem
                item={item}
                selected={selected}
                colors={colors}
                onRefresh={() => fetchRecords(selected)}
                onDelete={deleteRecord}
              />
            )}
            
          />

          <Text style={{ fontWeight: '600', color: colors.text, fontSize: 16, marginTop: 20 }}>
            Add Record (JSON)
          </Text>

          <TextInput
            value={newRecord}
            onChangeText={setNewRecord}
            placeholder='{ "name": "example" }'
            placeholderTextColor={colors.toggleText}
            multiline
            autoCapitalize="none"
            style={{
              height: 120,
              marginTop: 10,
              padding: 10,
              backgroundColor: colors.surface,
              color: colors.text,
              borderRadius: 6,
              borderColor: colors.border,
              borderWidth: 1,
              textAlignVertical: 'top',
            }}
          />

          <Pressable
            onPress={addRecord}
            style={{
              backgroundColor: colors.button,
              padding: 14,
              borderRadius: 6,
              marginTop: 10,
              alignItems: 'center'
            }}
          >
            <Text style={{
              color: colors.buttonText,
              fontWeight: 'bold'
            }}>Save Record</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={{ color: '#E85B5B', marginTop: 15 }}>{error}</Text> : null}
    </View>
  );
}
