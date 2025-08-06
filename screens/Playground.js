import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, Linking } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

const API_URL = 'http://localhost:34567';

export default function Playground() {
  const { colors } = useThemeContext();
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState([]);
  const [newRecord, setNewRecord] = useState('{}');
  const [fields, setFields] = useState([]);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('string');
  const [fieldValue, setFieldValue] = useState('');


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

  const addEmptyField = () => {
    setFields(prev => [...prev, { key: '', value: '', type: 'string' }]);
  };
  

  const addField = () => {
    if (!fieldKey.trim()) return setError('Key is required');
    const parsedValue =
      fieldType === 'number' ? Number(fieldValue) :
      fieldType === 'boolean' ? (fieldValue.toLowerCase() === 'true') :
      fieldValue;
  
    setFields(prev => [...prev, {
      key: fieldKey.trim(),
      value: parsedValue,
    }]);
  
    setFieldKey('');
    setFieldValue('');
    setFieldType('string');
  };
  

  const updateField = (index, prop, val) => {
    const copy = [...fields];
    copy[index][prop] = val;
    setFields(copy);
  };
  
  const deleteField = (index) => {
    const copy = [...fields];
    copy.splice(index, 1);
    setFields(copy);
  };
  

  const addRecord = async () => {
    setError('');
    const payload = {};
    for (const f of fields) {
      let val = f.value;
      if (f.type === 'number') val = Number(val);
      else if (f.type === 'boolean') val = val.toLowerCase() === 'true';
      payload[f.key] = val;
    }
      
    try {
      const res = await fetch(`${API_URL}/mock/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add');
      setFields([]);
      fetchRecords(selected);
    } catch {
      setError('Failed to save');
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


  const pickImageAsBase64 = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 1,
    });
  
    if (!result.canceled) {
      const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
      addImageField(base64String);
    }
  };
  
  const addImageField = (base64) => {
    setFields(prev => [...prev, {
      key: 'image', // تقدر تغيّرها إلى avatar أو أي اسم
      value: base64,
      type: 'string',
    }]);
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
          <View style={{ gap: 4 }}>
            {Object.entries(item).map(([key, val]) => {
              const isImage = typeof val === 'string' && val.startsWith('data:image');
              return (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>
                    {`"${key}": `}
                  </Text>
                  {isImage ? (
                    <>
                      <Text style={{ color: colors.text, fontSize: 13 }}>"[base64 image]"</Text>
                      <Image
                        source={{ uri: val }}
                        style={{ width: 32, height: 32, borderRadius: 4, marginLeft: 8 }}
                      />
                    </>
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 13 }}>
                      {JSON.stringify(val)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
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
  onPress={() => Linking.openURL(`${API_URL}/mock/${item}`)}
  style={{ padding: 6 }}
>
  <Text style={{ fontSize: 14, color: colors.text }}>🔗</Text>
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
            Add Record (Fields)
          </Text>

          {fields.map((field, index) => (
            <View key={index} style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
              <TextInput
                placeholder="Key"
                value={field.key}
                onChangeText={(text) => updateField(index, 'key', text)}
                placeholderTextColor={colors.toggleText}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  padding: 8,
                  borderRadius: 6,
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginRight: 8,
                }}
              />
              <TextInput
                placeholder="Value"
                value={field.value.toString()}
                onChangeText={(text) => updateField(index, 'value', text)}
                placeholderTextColor={colors.toggleText}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  padding: 8,
                  borderRadius: 6,
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginRight: 8,
                }}
              />
              <View style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 6,
                marginRight: 8,
                overflow: 'hidden',
              }}>
                <Picker
                  selectedValue={field.type}
                  onValueChange={(itemValue) => updateField(index, 'type', itemValue)}
                  style={{
                    width: 100,
                    height: 40,
                    color: colors.text,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Picker.Item label="String" value="string" />
                  <Picker.Item label="Number" value="number" />
                  <Picker.Item label="Boolean" value="boolean" />
                </Picker>
              </View>
              <Pressable onPress={() => deleteField(index)}>
                <Text style={{ color: '#E85B5B', fontWeight: 'bold', fontSize: 20 }}>✕</Text>
              </Pressable>
            
            </View>
          ))}
            <Pressable
            onPress={addEmptyField}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              padding: 10,
              borderRadius: 6,
              marginTop: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: 'bold' }}>+ Add Field</Text>
          </Pressable>
         <Pressable
              onPress={pickImageAsBase64}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 10,
                borderRadius: 6,
                marginTop: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>🖼️ Add Image (base64)</Text>
           </Pressable>

       {fields.map((field, index) => {
          const isImageField = field.key.toLowerCase().includes('image') && field.value.startsWith('data:image');
          return (
            <View key={index} style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
              ...
              {isImageField && (
                <Image
                  source={{ uri: field.value }}
                  style={{ width: 50, height: 50, borderRadius: 6, marginLeft: 8 }}
                />
              )}
            </View>
          );
        })}

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
