import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert ,Linking} from 'react-native';
import { useThemeContext } from '../context/ThemeContext';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DEFAULT_API_URL = 'http://localhost:34567/api/endpoints';

export default function Playground() {
  const { colors } = useThemeContext();
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  const [endpoints, setEndpoints] = useState([]);
  const [mockPort, setMockPort] = useState(34567);
  const [newEndpoint, setNewEndpoint] = useState({ method: 'GET', url: '', response: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      console.log('Fetched endpoints:', data); 
      setEndpoints(Array.isArray(data) ? data : (data.endpoints || []));
      setMockPort(data.port || 34567);
    } catch (e) {
      setError('Failed to load endpoints');
    }
    setLoading(false);
  };

  useEffect(() => { fetchEndpoints(); }, [apiUrl]);

  const isValidJson = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    setError('');
    if (!newEndpoint.url.trim()) {
      setError('URL is required');
      return;
    }
    if (!isValidJson(newEndpoint.response)) {
      setError('Response must be valid JSON');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEndpoint),
      });
      if (!res.ok) throw new Error('API error');
      setNewEndpoint({ method: 'GET', url: '', response: '' });
      fetchEndpoints();
    } catch {
      setError('Failed to add endpoint');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await fetch(`${apiUrl.replace(/\/$/, '')}/${id}`, { method: 'DELETE' });
      fetchEndpoints();
    } catch {
      setError('Failed to delete');
    }
    setLoading(false);
  };

  return (
    <View style={{ padding: 22, flex: 1, backgroundColor: colors.background }}>
      <Text style={{
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12
      }}>
        API Endpoints
      </Text>

      <FlatList
        data={endpoints}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <Text style={{ color: colors.toggleText, marginTop: 15 }}>
            No endpoints yet.
          </Text>
        }
        renderItem={({ item }) => {
            const endpointUrl = `http://localhost:${mockPort}/mock${item.url.startsWith('/') ? '' : '/'}${item.url}`;
            return (
              <View style={{
                flexDirection: 'column',
                backgroundColor: colors.surface,
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.toggleText, minWidth: 58 }}>{item.method}</Text>
                  <Text style={{ color: colors.text, flex: 1 }}>{item.url}</Text>
                  {/* زر فتح الرابط */}
                  <Pressable
                    onPress={() => Linking.openURL(endpointUrl)}
                    style={{
                      padding: 7,
                      marginLeft: 5,
                      borderRadius: 4,
                      backgroundColor: colors.button,
                    }}>
                    <Text style={{ color: colors.buttonText }}>Open</Text>
                  </Pressable>
                  {/* زر حذف مباشر */}
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    style={{ padding: 7, marginLeft: 5 }}>
                    <Text style={{ color: '#E85B5B' }}>Delete</Text>
                  </Pressable>
                </View>
                {/* رابط للتجربة (قابل للنسخ فقط) */}
                <Text
                  selectable
                  style={{
                    color: colors.toggleText,
                    fontSize: 12,
                    marginTop: 3,
                    marginLeft: 58,
                    textDecorationLine: 'underline'
                  }}
                >
                  {`Test: ${endpointUrl}`}
                </Text>
              </View>
            );
          }}
      />

      <Text style={{
        fontSize: 18,
        marginTop: 30,
        color: colors.text,
        fontWeight: '600'
      }}>
        Add Endpoint
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {METHODS.map(m =>
          <Pressable
            key={m}
            onPress={() => setNewEndpoint(ep => ({ ...ep, method: m }))}
            style={{
              backgroundColor: newEndpoint.method === m ? colors.button : colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 5,
              marginRight: 8,
              borderWidth: 1,
              borderColor: colors.border
            }}>
            <Text style={{
              color: newEndpoint.method === m ? colors.buttonText : colors.text,
              fontWeight: 'bold',
              fontSize: 13
            }}>{m}</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        placeholder="Endpoint URL (e.g. /users)"
        placeholderTextColor={colors.toggleText}
        value={newEndpoint.url}
        autoCapitalize="none"
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 7,
          marginTop: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: colors.border
        }}
        onChangeText={text => setNewEndpoint(ep => ({ ...ep, url: text }))}
      />
      <TextInput
        placeholder='Response (must be valid JSON)'
        placeholderTextColor={colors.toggleText}
        value={newEndpoint.response}
        autoCapitalize="none"
        multiline
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 7,
          marginTop: 10,
          padding: 10,
          height: 90,
          textAlignVertical: 'top',
          borderWidth: 1,
          borderColor: colors.border
        }}
        onChangeText={text => setNewEndpoint(ep => ({ ...ep, response: text }))}
      />

      {error ?
        <Text style={{ color: '#E85B5B', marginTop: 12 }}>{error}</Text>
        : null}

      <Pressable
        onPress={handleAdd}
        disabled={!newEndpoint.url || !newEndpoint.response || loading}
        style={{
          backgroundColor: (!newEndpoint.url || !newEndpoint.response || loading) ? colors.border : colors.button,
          padding: 14,
          borderRadius: 7,
          marginTop: 16,
          alignItems: 'center',
        }}>
        <Text style={{
          color: colors.buttonText,
          fontWeight: 'bold',
          fontSize: 16
        }}>
          Add Endpoint
        </Text>
      </Pressable>
    </View>
  );
}
