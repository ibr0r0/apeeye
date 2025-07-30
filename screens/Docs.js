import React from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useThemeContext } from '../context/ThemeContext';

export default function Docs() {
  const { colors } = useThemeContext();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.emoji, { color: colors.text }]}>📚</Text>
      <Text style={[styles.title, { color: colors.text }]}>Apeeye Docs</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>What is Apeeye?</Text>
      <Text style={[styles.text, { color: colors.text }]}>
        Apeeye is a zero-bullshit API mocking tool for frontend devs. No signup, no config. Create fake APIs in seconds.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
      <Text style={[styles.text, { color: colors.text }]}>
        • Make fake endpoints like /users or /stats{"\n"}
        • Instantly test any HTTP method{"\n"}
        • Full local persistence – your data stays{"\n"}
        • Error simulation (404, 500, etc){"\n"}
        • Works in dark & light mode
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Getting Started</Text>
<Text style={[styles.text, { color: colors.text }]}>
  1. Start the Expo web app:
  {"\n"}   <Text style={{ fontFamily: 'monospace' }}>npx expo start --web</Text>
  {"\n\n"}2. In a new terminal, start the server:
  {"\n"}   <Text style={{ fontFamily: 'monospace' }}>node server/index.js</Text>
  {"\n\n"}3. Open the Playground tab.
  {"\n"}4. Add your first endpoint (like <Text style={{ fontFamily: 'monospace' }}>/users</Text>).
  {"\n"}5. Use the mock API in your frontend.
</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Examples</Text>
      <Text style={[styles.codeBlock, { color: colors.text }]}>
        GET /users{"\n"}
        → Returns user list.{"\n\n"}
        POST /order{"\n"}
        → Fakes order creation.{"\n\n"}
        GET /fail?type=500{"\n"}
        → Simulates a server error.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>FAQ</Text>
      <Text style={[styles.text, { color: colors.text }]}>
        Q: Login?{"\n"}
        A: Never.{"\n\n"}
        Q: Where is my data?{"\n"}
        A: Stays local, no sync.{"\n\n"}
        Q: Shareable mocks?{"\n"}
        A: Soon.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Coming Soon</Text>
      <Text style={[styles.text, { color: colors.text }]}>
        - Shareable endpoints{"\n"}
        - Custom delays{"\n"}
        - Export to Postman/cURL{"\n"}
        - Webhook events
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  emoji: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.88,
  },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#00000020',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
});
